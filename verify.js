
/**
 * design-csv-to-json.js
 *
 * Excel 由来の API 設計 CSV を読み取り、
 * requestBody / responseBody のスキーマを JSON（api_design.json）として生成する。
 *
 * 特徴:
 * - 既存 CSV フォーマットを変更しない
 * - 複数の「プロパティ」列のズレから階層（ネスト）を自動推定
 * - 多段ネスト（スタック方式）対応
 * - array<string>, string[], object[], Array<string> 等をすべて許容
 * - items 未記載の配列型も自動補完
 * - パスは config から取得（~/workspace/... 対応）
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

/**
 * 型表記を正規化
 * - Array<string> -> array<string>
 * - string[]      -> array<string>
 * - object[]      -> array<object>
 */
const normalizeTypeText = (raw) => {
  const t0 = normalizeCell(raw);
  if (!t0) return "";

  const t = t0.trim();

  // Array<T>
  const mGenericArray = t.match(/^Array\s*<\s*(.+?)\s*>$/i);
  if (mGenericArray) {
    return `array<${mGenericArray[1].trim().toLowerCase()}>`;
  }

  // T[]
  const mBracketArray = t.match(/^(.+?)\s*\[\s*\]$/);
  if (mBracketArray) {
    return `array<${mBracketArray[1].trim().toLowerCase()}>`;
  }

  // array<T> / map<T>
  return t
    .replace(/^array\s*</i, "array<")
    .replace(/^map\s*</i, "map<")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

/**
 * 型文字列から OpenAPI Schema を生成
 */
const buildSchemaFromType = (typeText) => {
  const t = normalizeTypeText(typeText);
  if (!t) return null;

  // map<T>
  const map = t.match(/^map<(.+)>$/);
  if (map) {
    return {
      type: "object",
      additionalProperties: buildSchemaFromType(map[1]) || { type: "object" },
    };
  }

  // array<T>
  const arr = t.match(/^array<(.+)>$/);
  if (arr) {
    return {
      type: "array",
      items: buildSchemaFromType(arr[1]) || { type: "object" },
    };
  }

  if (t === "object") return { type: "object", properties: {} };
  if (t === "string") return { type: "string" };
  if (t === "integer" || t === "int") return { type: "integer" };
  if (t === "number") return { type: "number" };
  if (t === "boolean" || t === "bool") return { type: "boolean" };

  // string(date-time) 等
  const fmt = t.match(/^string\s*\(\s*([^)]+)\s*\)$/);
  if (fmt) return { type: "string", format: fmt[1].trim() };

  // 不明型は string 扱い
  return { type: "string" };
};

const ensureSchemaContainer = (schema) => {
  if (!schema || typeof schema !== "object") return schema;

  if (schema.type === "object") {
    if (!schema.properties) schema.properties = {};
  }

  if (schema.type === "array") {
    if (!schema.items) schema.items = { type: "object", properties: {} };
    if (schema.items.type === "object" && !schema.items.properties) {
      schema.items.properties = {};
    }
  }

  if (schema.type === "object" && schema.additionalProperties) {
    if (
      schema.additionalProperties.type === "object" &&
      !schema.additionalProperties.properties
    ) {
      schema.additionalProperties.properties = {};
    }
  }

  return schema;
};

const isRequiredMark = (v) => {
  const s = normalizeCell(v).toLowerCase();
  return ["○", "◯", "o", "yes", "true", "1"].includes(s);
};

const detectSection = (row) => {
  for (const c of row) {
    const v = normalizeCell(c);
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

const isNoneRow = (row, propCols) =>
  propCols.some((c) => normalizeCell(row[c]).toLowerCase() === "none");

/* =========================
 * Column Detection
 * ========================= */

const detectColumns = (records) => {
  const headerRow = records.findIndex((r) =>
    r.some((c) => normalizeCell(c) === "プロパティ")
  );
  if (headerRow < 0) {
    throw new Error("CSV に「プロパティ」ヘッダが見つかりません");
  }

  const header = records[headerRow];

  const propCols = [];
  let descCol = -1;
  let typeCol = -1;
  let reqCol = -1;
  let apiCol = -1;
  let methodCol = -1;

  header.forEach((h, i) => {
    const v = normalizeCell(h);
    if (v === "プロパティ") propCols.push(i);
    if (v === "説明") descCol = i;
    if (v === "型") typeCol = i;
    if (v === "必須") reqCol = i;
    if (v.toLowerCase() === "api") apiCol = i;
    if (v.toLowerCase() === "method") methodCol = i;
  });

  return { headerRow, propCols, descCol, typeCol, reqCol, apiCol, methodCol };
};

/* =========================
 * Core Parser
 * ========================= */

const parseDesignCsvToJson = (csvText) => {
  const records = parse(csvText, {
    relax_column_count: true,
    skip_empty_lines: false,
  });

  const cols = detectColumns(records);
  const result = { paths: {} };

  let currentApi = null;
  let currentMethod = null;
  let currentSection = null;
  let rootSchemas = {};
  let stack = [];

  for (let r = cols.headerRow + 1; r < records.length; r += 1) {
    const row = records[r];

    const api = normalizeCell(row[cols.apiCol]);
    const method = normalizeCell(row[cols.methodCol]).toUpperCase();

    if (api && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      currentApi = api;
      currentMethod = method.toLowerCase();

      if (!result.paths[currentApi]) result.paths[currentApi] = {};
      result.paths[currentApi][currentMethod] = {
        description: "",
        requestBody: null,
        responseBody: null,
      };

      rootSchemas = {
        requestBody: { type: "object", properties: {} },
        responseBody: { type: "object", properties: {} },
      };

      stack = [];
      currentSection = null;
      continue;
    }

    const sec = detectSection(row);
    if (sec) {
      currentSection = sec;
      stack = [rootSchemas[currentSection]];
      continue;
    }

    if (!currentApi || !currentSection) continue;
    if (isNoneRow(row, cols.propCols)) continue;

    const p = getPropertyAtRow(row, cols.propCols);
    if (!p) continue;

    const fieldName = p.name;
    const fieldType = row[cols.typeCol];
    const fieldDesc = normalizeCell(row[cols.descCol]);
    const required = isRequiredMark(row[cols.reqCol]);

    const fieldSchema = ensureSchemaContainer(
      buildSchemaFromType(fieldType) || { type: "object", properties: {} }
    );

    if (fieldDesc) fieldSchema.description = fieldDesc;

    const targetIndex = p.level + 1;
    stack = stack.slice(0, targetIndex);

    const parent = stack[targetIndex - 1] || rootSchemas[currentSection];
    ensureSchemaContainer(parent);

    parent.properties[fieldName] = fieldSchema;

    if (required) {
      if (!parent.required) parent.required = [];
      parent.required.push(fieldName);
    }

    stack[targetIndex] = fieldSchema;
  }

  Object.values(result.paths).forEach((methods) => {
    Object.values(methods).forEach((def) => {
      if (Object.keys(rootSchemas.requestBody.properties).length > 0) {
        def.requestBody = rootSchemas.requestBody;
      }
      if (Object.keys(rootSchemas.responseBody.properties).length > 0) {
        def.responseBody = rootSchemas.responseBody;
      }
    });
  });

  return result;
};

/* =========================
 * Main
 * ========================= */

const main = () => {
  const swaggerRootDir = path.resolve(__dirname, "..");
  const configPath = path.resolve(swaggerRootDir, "config", "wallet-api.json");

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  const csvPath = resolveConfigPath(config.apiDetailsPath);
  const outputDir = resolveConfigPath(config.outputPath);
  const outputFile = path.join(outputDir, "api_design.json");

  const csvText = fs.readFileSync(csvPath, "utf-8");
  const json = parseDesignCsvToJson(csvText);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(json, null, 2)}\n`, "utf-8");

  console.log("api_design.json を生成しました");
  console.log(`  ${outputFile}`);
  console.log("");
  console.log("使い方:");
  console.log("  cd tools/swagger");
  console.log("  node scripts/design-csv-to-json.js");
};

if (require.main === module) {
  main();
}

module.exports = {
  parseDesignCsvToJson,
};
