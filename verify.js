
/**
 * design-csv-to-json.js
 *
 * CSV 形式の API 設計書（Excel 由来）を読み取り、
 * requestBody / responseBody を JSON 形式（api_design.json）に変換する。
 *
 * - CSV は既存フォーマットを変更しない
 * - 複数の「プロパティ」列のズレで階層（ネスト）を自動推定
 * - 多段ネスト（スタック）対応
 * - 入出力パスは config JSON から取得する
 * - config のパスが ~/workspace/... の場合も動作するように ~ を展開する
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { parse } = require("csv-parse/sync");

/* =========================
 * Path Utility
 * ========================= */

const expandHome = (p) => {
  if (!p || typeof p !== "string") return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
};

const resolveConfigPath = (p) => path.resolve(expandHome(p));

/* =========================
 * CSV Utility
 * ========================= */

const normalizeCell = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\u00A0/g, " ").trim();
};

const normalizeTypeText = (raw) => {
  const t = normalizeCell(raw);
  if (!t) return "";

  // Array<T> -> array<t>
  const arrayMatch = t.match(/^Array\s*<\s*(.+?)\s*>$/i);
  if (arrayMatch) {
    return `array<${arrayMatch[1].trim().toLowerCase()}>`;
  }

  // object[] -> array<object>
  if (/^object\s*\[\s*\]$/i.test(t)) {
    return "array<object>";
  }

  // array<T>, object, string...
  return t
    .replace(/^array\s*</i, "array<")
    .replace(/^map\s*</i, "map<")
    .trim()
    .toLowerCase();
};

const buildSchemaFromType = (typeText) => {
  const t = normalizeTypeText(typeText);
  if (!t) return null;

  // array<T>
  const arr = t.match(/^array<(.+)>$/);
  if (arr) {
    return {
      type: "array",
      items: buildSchemaFromType(arr[1]) || { type: "object" },
    };
  }

  // map<T>（将来拡張。現状 CSV に無くても壊れない）
  const map = t.match(/^map<(.+)>$/);
  if (map) {
    return {
      type: "object",
      additionalProperties: buildSchemaFromType(map[1]) || { type: "object" },
    };
  }

  if (t === "object") return { type: "object", properties: {} };
  if (t === "string") return { type: "string" };
  if (t === "integer" || t === "int") return { type: "integer" };
  if (t === "number") return { type: "number" };
  if (t === "boolean" || t === "bool") return { type: "boolean" };

  // string(date-time) 等を軽く許容
  const fmt = t.match(/^string\s*\(\s*([^)]+)\s*\)$/);
  if (fmt) return { type: "string", format: fmt[1].trim() };

  // 不明は string 扱い
  return { type: "string" };
};

const ensureObjectSchema = (schema) => {
  if (!schema || typeof schema !== "object") return schema;
  if (schema.type === "object" && !schema.properties) schema.properties = {};
  return schema;
};

const ensureSchemaContainer = (schema) => {
  if (!schema || typeof schema !== "object") return schema;

  if (schema.type === "object") {
    ensureObjectSchema(schema);
    return schema;
  }

  if (schema.type === "array") {
    if (!schema.items || typeof schema.items !== "object") schema.items = { type: "object", properties: {} };
    if (schema.items.type === "object") ensureObjectSchema(schema.items);
    return schema;
  }

  if (schema.type === "object" && schema.additionalProperties) {
    // map の additionalProperties が object の場合
    if (schema.additionalProperties.type === "object") ensureObjectSchema(schema.additionalProperties);
    return schema;
  }

  return schema;
};

const isRequiredMark = (v) => {
  const s = normalizeCell(v).toLowerCase();
  if (!s) return false;
  return ["○", "◯", "o", "yes", "true", "1"].includes(s);
};

const detectSection = (row) => {
  for (let i = 0; i < row.length; i += 1) {
    const v = normalizeCell(row[i]);
    if (v === "requestBody") return "requestBody";
    if (v === "responseBody") return "responseBody";
  }
  return null;
};

const getPropertyAtRow = (row, propCols) => {
  for (let i = 0; i < propCols.length; i += 1) {
    const v = normalizeCell(row[propCols[i]]);
    if (v) return { level: i, name: v };
  }
  return null;
};

const isNoneRow = (row, propCols) => {
  for (const c of propCols) {
    const v = normalizeCell(row[c]).toLowerCase();
    if (v === "none") return true;
  }
  return false;
};

/* =========================
 * Column Detection
 * ========================= */

const detectColumns = (records, scanMaxRows = 40) => {
  const max = Math.min(records.length, scanMaxRows);

  const headerHits = [];
  for (let r = 0; r < max; r += 1) {
    const row = records[r];
    for (let c = 0; c < row.length; c += 1) {
      const v = normalizeCell(row[c]);
      if (!v) continue;

      if (v === "プロパティ" || v.toLowerCase() === "property") headerHits.push({ r, c, key: "property" });
      if (v === "説明" || v.toLowerCase() === "description") headerHits.push({ r, c, key: "description" });
      if (v === "型" || v.toLowerCase() === "type") headerHits.push({ r, c, key: "type" });
      if (v === "必須" || v.toLowerCase() === "required") headerHits.push({ r, c, key: "required" });
      if (v.toLowerCase() === "api") headerHits.push({ r, c, key: "api" });
      if (v.toLowerCase() === "method") headerHits.push({ r, c, key: "method" });
      if (v.toLowerCase() === "description") headerHits.push({ r, c, key: "topDescription" });
    }
  }

  const rowScore = new Map();
  for (const h of headerHits) rowScore.set(h.r, (rowScore.get(h.r) || 0) + 1);

  let headerRow = 0;
  let best = -1;
  for (const [r, s] of rowScore.entries()) {
    if (s > best) {
      best = s;
      headerRow = r;
    }
  }

  const header = records[headerRow] || [];

  const propCols = [];
  let descCol = -1;
  let typeCol = -1;
  let reqCol = -1;
  let apiCol = -1;
  let methodCol = -1;
  let topDescCol = -1;

  for (let c = 0; c < header.length; c += 1) {
    const v = normalizeCell(header[c]);
    if (v === "プロパティ" || v.toLowerCase() === "property") propCols.push(c);
    if (v === "説明" || v.toLowerCase() === "description") descCol = c;
    if (v === "型" || v.toLowerCase() === "type") typeCol = c;
    if (v === "必須" || v.toLowerCase() === "required") reqCol = c;
    if (v.toLowerCase() === "api") apiCol = c;
    if (v.toLowerCase() === "method") methodCol = c;
    if (v.toLowerCase() === "description") topDescCol = c;
  }

  const fallbackFindCol = (labelsLower) => {
    for (let r = 0; r < max; r += 1) {
      const row = records[r];
      for (let c = 0; c < row.length; c += 1) {
        const v = normalizeCell(row[c]).toLowerCase();
        if (labelsLower.includes(v)) return c;
      }
    }
    return -1;
  };

  if (apiCol < 0) apiCol = fallbackFindCol(["api"]);
  if (methodCol < 0) methodCol = fallbackFindCol(["method"]);
  if (topDescCol < 0) topDescCol = fallbackFindCol(["description"]);
  if (descCol < 0) descCol = fallbackFindCol(["説明".toLowerCase(), "description"]);
  if (typeCol < 0) typeCol = fallbackFindCol(["型".toLowerCase(), "type"]);
  if (reqCol < 0) reqCol = fallbackFindCol(["必須".toLowerCase(), "required"]);

  if (propCols.length === 0) {
    throw new Error("CSV から「プロパティ」列を検出できませんでした。ヘッダ行を確認してください。");
  }

  return { headerRow, propCols, descCol, typeCol, reqCol, apiCol, methodCol, topDescCol };
};

/* =========================
 * Core Parser
 * ========================= */

const attachChildField = (parentSchema, fieldName, fieldSchema, meta) => {
  const name = normalizeCell(fieldName);
  if (!name) return;

  const desc = normalizeCell(meta?.description);
  const required = meta?.required === true;

  ensureSchemaContainer(parentSchema);
  ensureSchemaContainer(fieldSchema);

  if (desc) fieldSchema.description = desc;

  // object
  if (parentSchema.type === "object" && parentSchema.properties) {
    parentSchema.properties[name] = fieldSchema;
    if (required) {
      if (!Array.isArray(parentSchema.required)) parentSchema.required = [];
      if (!parentSchema.required.includes(name)) parentSchema.required.push(name);
    }
    return;
  }

  // array => items.properties
  if (parentSchema.type === "array") {
    if (!parentSchema.items || typeof parentSchema.items !== "object") {
      parentSchema.items = { type: "object", properties: {} };
    }
    if (parentSchema.items.type !== "object") {
      parentSchema.items = { type: "object", properties: {} };
    }
    ensureObjectSchema(parentSchema.items);

    parentSchema.items.properties[name] = fieldSchema;
    if (required) {
      if (!Array.isArray(parentSchema.items.required)) parentSchema.items.required = [];
      if (!parentSchema.items.required.includes(name)) parentSchema.items.required.push(name);
    }
    return;
  }

  // map => additionalProperties.properties
  if (parentSchema.type === "object" && parentSchema.additionalProperties) {
    const ap = parentSchema.additionalProperties;
    if (!ap || typeof ap !== "object") {
      parentSchema.additionalProperties = { type: "object", properties: {} };
    }
    if (parentSchema.additionalProperties.type !== "object") {
      parentSchema.additionalProperties = { type: "object", properties: {} };
    }
    ensureObjectSchema(parentSchema.additionalProperties);

    parentSchema.additionalProperties.properties[name] = fieldSchema;
    if (required) {
      if (!Array.isArray(parentSchema.additionalProperties.required)) parentSchema.additionalProperties.required = [];
      if (!parentSchema.additionalProperties.required.includes(name)) parentSchema.additionalProperties.required.push(name);
    }
  }
};

const parseDesignCsvToJson = (csvText) => {
  const records = parse(csvText, {
    relax_column_count: true,
    skip_empty_lines: false,
  });

  const cols = detectColumns(records);

  const getCell = (row, idx) => {
    if (idx < 0) return "";
    return normalizeCell(row[idx]);
  };

  // API ブロック開始行を検出（api + method）
  const apiBlocks = [];
  for (let r = cols.headerRow + 1; r < records.length; r += 1) {
    const row = records[r];
    const api = getCell(row, cols.apiCol);
    const method = getCell(row, cols.methodCol).toUpperCase();
    const isMethod = ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (api && isMethod) apiBlocks.push({ start: r, api, method });
  }

  const blocks = apiBlocks.map((b, i) => {
    const end = i + 1 < apiBlocks.length ? apiBlocks[i + 1].start - 1 : records.length - 1;
    return { ...b, end };
  });

  const result = { paths: {} };

  for (const block of blocks) {
    const apiPath = block.api;
    const method = block.method.toLowerCase();

    const desc = getCell(records[block.start], cols.topDescCol) || getCell(records[block.start], cols.descCol);

    if (!result.paths[apiPath]) result.paths[apiPath] = {};
    result.paths[apiPath][method] = {
      description: desc || "",
      requestBody: null,
      responseBody: null,
    };

    let currentSection = null;

    const rootSchemas = {
      requestBody: { type: "object", properties: {} },
      responseBody: { type: "object", properties: {} },
    };

    // stack[0] は section の root schema
    let stack = [];

    for (let r = block.start; r <= block.end; r += 1) {
      const row = records[r];

      const sec = detectSection(row);
      if (sec) {
        currentSection = sec;
        stack = [rootSchemas[currentSection]];
        continue;
      }

      if (!currentSection) continue;
      if (isNoneRow(row, cols.propCols)) continue;

      const p = getPropertyAtRow(row, cols.propCols);
      if (!p) continue;

      const fieldName = p.name;
      if (normalizeCell(fieldName).toLowerCase() === "none") continue;

      const fieldTypeText = getCell(row, cols.typeCol);
      const fieldDesc = getCell(row, cols.descCol);
      const required = isRequiredMark(getCell(row, cols.reqCol));

      const fieldSchema = ensureSchemaContainer(
        buildSchemaFromType(fieldTypeText) || { type: "object", properties: {} }
      );

      // level=0 のフィールドは root の直下 => stack[0]=root, stack[1]=field
      const targetIndex = p.level + 1;

      // 目的の階層まで stack を切り詰める
      stack = stack.slice(0, targetIndex);

      const parentSchema = stack[targetIndex - 1] || rootSchemas[currentSection];

      attachChildField(parentSchema, fieldName, fieldSchema, {
        description: fieldDesc,
        required,
      });

      stack[targetIndex] = fieldSchema;
    }

    const hasProps = (s) => s && s.type === "object" && s.properties && Object.keys(s.properties).length > 0;

    result.paths[apiPath][method].requestBody = hasProps(rootSchemas.requestBody) ? rootSchemas.requestBody : null;
    result.paths[apiPath][method].responseBody = hasProps(rootSchemas.responseBody) ? rootSchemas.responseBody : null;
  }

  return result;
};

/* =========================
 * Main
 * ========================= */

const main = () => {
  const swaggerRootDir = path.resolve(__dirname, "..");

  // configPath: 引数があればそれを使う。なければデフォルト
  const configPathArg = process.argv[2];
  const configPathAbs = configPathArg
    ? resolveConfigPath(configPathArg)
    : path.resolve(swaggerRootDir, "config", "wallet-api.json");

  if (!fs.existsSync(configPathAbs)) {
    console.error(`config が見つかりません: ${configPathAbs}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPathAbs, "utf-8"));

  if (!config.apiDetailsPath) {
    console.error("config.apiDetailsPath が未設定です");
    process.exit(1);
  }
  if (!config.outputPath) {
    console.error("config.outputPath が未設定です");
    process.exit(1);
  }

  const csvPathAbs = resolveConfigPath(config.apiDetailsPath);
  const outputDirAbs = resolveConfigPath(config.outputPath);
  const outputFileAbs = path.join(outputDirAbs, "api_design.json");

  if (!fs.existsSync(csvPathAbs)) {
    console.error(`CSV が見つかりません: ${csvPathAbs}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPathAbs, "utf-8");
  const json = parseDesignCsvToJson(csvText);

  fs.mkdirSync(outputDirAbs, { recursive: true });
  fs.writeFileSync(outputFileAbs, `${JSON.stringify(json, null, 2)}\n`, "utf-8");

  console.log("API 設計 JSON を生成しました:");
  console.log(`  ${outputFileAbs}`);
  console.log("");
  console.log("使い方:");
  console.log("  cd tools/swagger");
  console.log("  node scripts/design-csv-to-json.js");
  console.log("  # 別 config を使う場合:");
  console.log("  node scripts/design-csv-to-json.js ./config/wallet-api.json");
};

if (require.main === module) {
  main();
}

module.exports = {
  parseDesignCsvToJson,
  resolveConfigPath,
  expandHome,
};
