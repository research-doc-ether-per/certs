const log4js = require("log4js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const configData = require("../config/config.json");

const log4jsConfig = require("../../config/log4js.json");

// ログ設定（※図1と同じ形式を維持）
const fileName = "design-csv-to-json";
log4jsConfig.appenders.file.filename = `../logs/${fileName}.log`;
log4js.configure(log4jsConfig);
const logger = log4js.getLogger(`${fileName}`);

/**
 * 文字列をトリムして空なら null にする
 * @param {string} v
 * @returns {string|null}
 */
const toStrOrNull = (v) => {
  logger.debug("toStrOrNull start");
  try {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  } finally {
    logger.debug("toStrOrNull end");
  }
};

/**
 * ~/ で始まるパスをホームディレクトリに展開する
 * @param {string} p
 * @returns {string}
 */
const expandTilde = (p) => {
  logger.debug("expandTilde start");
  try {
    const s = toStrOrNull(p);
    if (!s) return "";
    if (s.startsWith("~/")) return path.join(os.homedir(), s.slice(2));
    return s;
  } finally {
    logger.debug("expandTilde end");
  }
};

/**
 * ディレクトリを作成する（存在しない場合）
 * @param {string} dirPath
 * @returns {void}
 */
const ensureDir = (dirPath) => {
  logger.debug("ensureDir start");
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  } finally {
    logger.debug("ensureDir end");
  }
};

/**
 * CSV テキストを行配列へ（依存なし）
 * - ダブルクォートで囲まれたカンマや改行を扱える簡易実装
 * @param {string} csvText
 * @returns {string[][]}
 */
const parseCsv = (csvText) => {
  logger.debug("parseCsv start");
  try {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    const pushCell = () => {
      row.push(cell);
      cell = "";
    };

    const pushRow = () => {
      row = row.map((c) => (typeof c === "string" ? c.replace(/\r$/, "") : c));
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < csvText.length; i++) {
      const ch = csvText[i];
      const next = csvText[i + 1];

      if (ch === '"') {
        // "" はエスケープされたダブルクォート
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && ch === ",") {
        pushCell();
        continue;
      }

      if (!inQuotes && ch === "\n") {
        pushCell();
        pushRow();
        continue;
      }

      cell += ch;
    }

    // 最終セル/行
    pushCell();
    pushRow();

    // 末尾の完全空行を除去
    while (rows.length > 0) {
      const last = rows[rows.length - 1];
      const allEmpty = last.every((c) => !toStrOrNull(c));
      if (!allEmpty) break;
      rows.pop();
    }

    return rows;
  } finally {
    logger.debug("parseCsv end");
  }
};

/**
 * 行内の非空セルをすべて取得（idx付き）
 * @param {string[]} row
 * @returns {{ idx: number, value: string }[]}
 */
const listNonEmptyCells = (row) => {
  const out = [];
  for (let i = 0; i < row.length; i++) {
    const v = toStrOrNull(row[i]);
    if (v) out.push({ idx: i, value: v });
  }
  return out;
};

/**
 * "必須" っぽいセルか判定（required 判定用）
 * @param {string} v
 * @returns {boolean}
 */
const isRequiredMark = (v) => {
  const s = (toStrOrNull(v) || "").trim();
  if (!s) return false;
  return s === "○" || s.toLowerCase() === "required" || s === "必須";
};

/**
 * タイプ文字列の妥当性チェック（セルが型っぽいか）
 * @param {string|null} raw
 * @returns {boolean}
 */
const isTypeLikeCell = (raw) => {
  const v = (toStrOrNull(raw) || "").trim();
  if (!v) return false;

  const vv = v.toLowerCase().replace(/\s+/g, "");
  if (["string", "integer", "number", "boolean", "object"].includes(vv)) return true;
  if (vv === "object[]") return true;
  if (/^array<.+>$/.test(vv)) return true;
  if (/^.+\[\]+$/.test(vv)) return true; // string[] / object[][] など
  if (/^array<.+>$/.test(vv)) return true;
  if (/^Array<.+>$/.test(v)) return true;
  return false;
};

/**
 * 行から "型" っぽいセル index を探す（右側にある想定）
 * @param {string[]} row
 * @returns {number}
 */
const findTypeCellIndex = (row) => {
  logger.debug("findTypeCellIndex start");
  try {
    for (let i = row.length - 1; i >= 0; i--) {
      if (isTypeLikeCell(row[i])) return i;
    }
    return -1;
  } finally {
    logger.debug("findTypeCellIndex end");
  }
};

/**
 * タイプ文字列を OpenAPI 風の schema に寄せて解釈する（配列ネスト対応）
 * 許容例:
 * - string, integer, number, boolean, object
 * - object[], string[], object[][], string[][][]
 * - array<object>, array<string>, array<array<object>>
 * - Array<string>, Array< array< object > >
 * @param {string|null} rawType
 * @returns {{ type: string, items?: any, properties?: any }}
 */
const parseTypeToSchema = (rawType) => {
  logger.debug("parseTypeToSchema start");
  try {
    const t0 = (toStrOrNull(rawType) || "object").trim();

    const normalizeScalar = (x) => {
      const v = String(x || "").toLowerCase().trim();
      if (v === "int" || v === "integer") return "integer";
      if (v === "number" || v === "float" || v === "double") return "number";
      if (v === "bool" || v === "boolean") return "boolean";
      if (v === "string") return "string";
      if (v === "object") return "object";
      return "object";
    };

    // 余計な空白を除去しつつ "Array<>" を "array<>" に正規化
    let t = t0.replace(/\s+/g, "").replace(/^Array</i, "array<");

    // 1) "array<...>" の再帰パース（array<array<object>> など）
    const parseGenericArray = (s) => {
      const m = s.match(/^array<(.+)>$/i);
      if (!m) return null;
      const inner = m[1];

      // inner がさらに array<...> なら再帰
      const innerArr = parseGenericArray(inner);
      if (innerArr) return { type: "array", items: innerArr };

      // inner が "object" など
      const innerScalar = normalizeScalar(inner);
      if (innerScalar === "object") return { type: "array", items: { type: "object", properties: {} } };
      return { type: "array", items: { type: innerScalar } };
    };

    const generic = parseGenericArray(t);
    if (generic) return generic;

    // 2) "xxx[][]..." の再帰パース（object[][] など）
    const suffixMatch = t.match(/^(.+?)(\[\]+)$/); // base + "[][]..."
    if (suffixMatch) {
      const base = suffixMatch[1];
      const brackets = suffixMatch[2]; // "[][]..."
      const depth = (brackets.match(/\[\]/g) || []).length;

      const baseScalar = normalizeScalar(base);
      let innerSchema = null;
      if (baseScalar === "object") innerSchema = { type: "object", properties: {} };
      else innerSchema = { type: baseScalar };

      // 外側から depth 回 array を巻く
      for (let i = 0; i < depth; i++) {
        innerSchema = { type: "array", items: innerSchema };
      }
      return innerSchema;
    }

    // 3) "object[]" 明示（Excelケース）
    if (t.toLowerCase() === "object[]") {
      return { type: "array", items: { type: "object", properties: {} } };
    }

    // 4) scalar
    const scalar = normalizeScalar(t);
    if (scalar === "object") return { type: "object", properties: {} };
    return { type: scalar };
  } finally {
    logger.debug("parseTypeToSchema end");
  }
};

/**
 * row の中から "description/api/method" の列を推測する
 * @param {string[]} headerRow
 * @returns {{ descIdx: number, apiIdx: number, methodIdx: number }}
 */
const detectMainColumns = (headerRow) => {
  logger.debug("detectMainColumns start");
  try {
    const lower = headerRow.map((c) => (toStrOrNull(c) || "").toLowerCase());

    const findIdx = (preds) => {
      for (let i = 0; i < lower.length; i++) {
        for (const p of preds) {
          if (lower[i] === p) return i;
        }
      }
      return -1;
    };

    const descIdx = findIdx(["description", "説明"]);
    const apiIdx = findIdx(["api", "path", "endpoint"]);
    const methodIdx = findIdx(["method", "httpmethod"]);

    return {
      descIdx: descIdx >= 0 ? descIdx : 0,
      apiIdx: apiIdx >= 0 ? apiIdx : 1,
      methodIdx: methodIdx >= 0 ? methodIdx : 2,
    };
  } finally {
    logger.debug("detectMainColumns end");
  }
};

/**
 * 行内のどこかに "requestBody/responseBody" があるか判定
 * @param {string[]} row
 * @returns {"requestBody"|"responseBody"|null}
 */
const detectBodySection = (row) => {
  logger.debug("detectBodySection start");
  try {
    for (const c of row) {
      const v = (toStrOrNull(c) || "").toLowerCase();
      if (v === "requestbody") return "requestBody";
      if (v === "responsebody") return "responseBody";
    }
    return null;
  } finally {
    logger.debug("detectBodySection end");
  }
};

/**
 * プロパティ表のヘッダ行かどうか
 * @param {string[]} row
 * @returns {boolean}
 */
const isPropertyTableHeaderRow = (row) => {
  logger.debug("isPropertyTableHeaderRow start");
  try {
    const joined = row.map((c) => (toStrOrNull(c) || "")).join("|");
    const hasProp = joined.includes("プロパティ") || joined.toLowerCase().includes("property");
    const hasType = joined.includes("型") || joined.toLowerCase().includes("type");
    return hasProp && hasType;
  } finally {
    logger.debug("isPropertyTableHeaderRow end");
  }
};

/**
 * "必須" っぽいセルを探して required を判定する
 * - Excel の ○ を想定
 * @param {string[]} row
 * @returns {boolean}
 */
const detectRequired = (row) => {
  logger.debug("detectRequired start");
  try {
    for (const c of row) {
      if (isRequiredMark(c)) return true;
    }
    return false;
  } finally {
    logger.debug("detectRequired end");
  }
};

/**
 * 型セルの左側からプロパティ名候補を拾う
 * - ネストは「より右の列に名前がある」前提で depth を推測
 * @param {string[]} row
 * @param {number} typeIdx
 * @returns {{ name: string|null, nameIdx: number }}
 */
const extractPropertyName = (row, typeIdx) => {
  logger.debug("extractPropertyName start");
  try {
    for (let i = typeIdx - 1; i >= 0; i--) {
      const v = toStrOrNull(row[i]);
      if (!v) continue;

      const vv = v.toLowerCase();
      if (vv === "プロパティ" || vv === "property" || vv === "説明" || vv === "description") continue;
      if (vv === "requestbody" || vv === "responsebody") continue;
      if (vv === "none") continue;

      // required の印は名前ではない
      if (isRequiredMark(v)) continue;

      // 型っぽい文字が紛れた場合は除外
      if (isTypeLikeCell(v)) continue;

      return { name: v, nameIdx: i };
    }
    return { name: null, nameIdx: -1 };
  } finally {
    logger.debug("extractPropertyName end");
  }
};

/**
 * 説明（description）候補を抽出する
 * - 「説明が固定列ではない」前提で、行の右側までスキャンして最も右にある説明候補を採用
 * - 除外対象: プロパティ名セル / 型セル / required印 / ヘッダ語 / requestBody/responseBody/none
 * @param {string[]} row
 * @param {number} nameIdx
 * @param {number} typeIdx
 * @returns {string|null}
 */
const extractDescription = (row, nameIdx, typeIdx) => {
  logger.debug("extractDescription start");
  try {
    const cells = listNonEmptyCells(row);

    // 右側の候補を優先する（=「最後まで」探索）
    for (let i = cells.length - 1; i >= 0; i--) {
      const { idx, value } = cells[i];

      if (idx === nameIdx) continue;
      if (idx === typeIdx) continue;

      const vLower = value.toLowerCase();

      if (vLower === "プロパティ" || vLower === "property") continue;
      if (vLower === "説明" || vLower === "description") continue;
      if (vLower === "型" || vLower === "type") continue;
      if (vLower === "requestbody" || vLower === "responsebody") continue;
      if (vLower === "none") continue;

      if (isRequiredMark(value)) continue;
      if (isTypeLikeCell(value)) continue;

      // それっぽい説明が見つかったら採用
      return value;
    }

    return null;
  } finally {
    logger.debug("extractDescription end");
  }
};

/**
 * object/array の中で「最も内側の object schema」を返す
 * - array の場合: items を辿って、items が object ならそれを返す
 * - items が未定義の場合: object items を作る
 * - items が scalar の場合: null を返す
 * @param {object} schema
 * @returns {object|null}
 */
const getInnermostObjectSchema = (schema) => {
  if (!schema) return null;

  if (schema.type === "object") {
    if (!schema.properties) schema.properties = {};
    return schema;
  }

  if (schema.type === "array") {
    if (!schema.items) schema.items = { type: "object", properties: {} };

    // items がさらに array なら潜る（配列の配列対応）
    let cur = schema.items;
    while (cur && cur.type === "array") {
      if (!cur.items) cur.items = { type: "object", properties: {} };
      cur = cur.items;
    }

    if (cur && cur.type === "object") {
      if (!cur.properties) cur.properties = {};
      return cur;
    }
    return null;
  }

  return null;
};

/**
 * スキーマへ子プロパティを追加する（配列ネスト対応）
 * @param {object} parentSchema
 * @param {string} name
 * @param {object} childSchema
 * @returns {void}
 */
const addChildProperty = (parentSchema, name, childSchema) => {
  logger.debug("addChildProperty start");
  try {
    if (!parentSchema || !name) return;

    const obj = getInnermostObjectSchema(parentSchema);
    if (!obj) return;

    if (!obj.properties) obj.properties = {};
    obj.properties[name] = childSchema;
  } finally {
    logger.debug("addChildProperty end");
  }
};

/**
 * required を「そのオブジェクトの required」に追加（配列の場合は最内側 object に追加）
 * @param {object} parentSchema
 * @param {string} propName
 * @param {boolean} required
 * @returns {void}
 */
const addRequiredIfNeeded = (parentSchema, propName, required) => {
  if (!required) return;
  if (!parentSchema || !propName) return;

  const obj = getInnermostObjectSchema(parentSchema);
  if (!obj) return;

  if (!Array.isArray(obj.required)) obj.required = [];
  if (!obj.required.includes(propName)) obj.required.push(propName);
};

/**
 * schema が「子を持ち得る」か（object / array(itemsがobject/array)）
 * @param {object} schema
 * @returns {boolean}
 */
const canHaveChildren = (schema) => {
  if (!schema) return false;
  if (schema.type === "object") return true;
  if (schema.type === "array") {
    // items が object/array の場合は子がぶら下がる可能性あり
    const it = schema.items;
    if (!it) return true; // 未定義なら後続で決まる可能性あり
    return it.type === "object" || it.type === "array";
  }
  return false;
};

/**
 * "none" 行かどうか（行内のどこかに none がある）
 * @param {string[]} row
 * @returns {boolean}
 */
const isNoneRow = (row) => {
  const joinedLower = row.map((c) => (toStrOrNull(c) || "").toLowerCase()).join("|");
  return joinedLower.includes("none");
};

/**
 * API 設計CSV（レイアウト型）を JSON へ変換する
 * @param {string} csvText
 * @returns {{ endpoints: any[] }}
 */
const parseDesignCsvToJson = (csvText) => {
  logger.debug("parseDesignCsvToJson start");
  try {
    const rows = parseCsv(csvText);
    if (rows.length === 0) return { endpoints: [] };

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const r = rows[i].map((c) => (toStrOrNull(c) || "").toLowerCase());
      if (r.includes("description") || r.includes("api") || r.includes("method") || r.includes("説明")) {
        headerRowIndex = i;
        break;
      }
    }

    const headerRow = rows[headerRowIndex] || [];
    const { descIdx, apiIdx, methodIdx } = detectMainColumns(headerRow);

    const endpoints = [];
    let current = null;
    let currentSection = null;

    // depth 推定の基準（プロパティ名が最初に現れた列）
    let baseNameIdx = null;

    // パース中の親スタック
    // { depth: number, schema: object }
    let stack = [];

    const resetPropertyParsingState = () => {
      baseNameIdx = null;
      stack = [];
    };

    const startNewEndpoint = (desc, api, method) => {
      const ep = {
        description: desc || "",
        api: api || "",
        method: (method || "").toUpperCase(),
        requestBody: null,
        responseBody: null,
      };
      endpoints.push(ep);
      current = ep;
      currentSection = null;
      resetPropertyParsingState();
    };

    const ensureSectionRootSchema = (sectionKey) => {
      if (!current) return null;

      if (sectionKey === "requestBody") {
        if (!current.requestBody) current.requestBody = { type: "object", properties: {} };
        return current.requestBody;
      }
      if (sectionKey === "responseBody") {
        if (!current.responseBody) current.responseBody = { type: "object", properties: {} };
        return current.responseBody;
      }
      return null;
    };

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];

      const apiVal = toStrOrNull(row[apiIdx]);
      const methodVal = toStrOrNull(row[methodIdx]);
      const descVal = toStrOrNull(row[descIdx]);

      // 新しい endpoint 開始
      if (apiVal && methodVal) {
        startNewEndpoint(descVal, apiVal, methodVal);
        continue;
      }

      if (!current) continue;

      // requestBody / responseBody セクション切替
      const section = detectBodySection(row);
      if (section) {
        currentSection = section;
        resetPropertyParsingState();
        ensureSectionRootSchema(section);
        continue;
      }

      if (!currentSection) continue;

      // プロパティ表ヘッダ
      if (isPropertyTableHeaderRow(row)) {
        resetPropertyParsingState();
        continue;
      }

      // none
      if (isNoneRow(row)) {
        if (currentSection === "requestBody") current.requestBody = null;
        if (currentSection === "responseBody") current.responseBody = null;
        resetPropertyParsingState();
        continue;
      }

      // 型セル検出
      const typeIdx = findTypeCellIndex(row);
      if (typeIdx < 0) continue;

      // プロパティ名検出
      const { name, nameIdx } = extractPropertyName(row, typeIdx);
      if (!name || nameIdx < 0) continue;

      // depth 基準設定
      if (baseNameIdx === null) baseNameIdx = nameIdx;

      // depth: 右に行くほど深い（CSVの縮進表現）
      const depth = Math.max(0, nameIdx - baseNameIdx);

      const root = ensureSectionRootSchema(currentSection);
      if (!root) continue;

      // stack を depth に合わせて戻す（同階層 or 上位へ戻る）
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      // 親 schema（stack が空なら root）
      const parentSchema = stack.length === 0 ? root : stack[stack.length - 1].schema;

      // 子 schema 作成
      const schema = parseTypeToSchema(row[typeIdx]);

      // 説明は「最後まで」探索して設定
      const propDesc = extractDescription(row, nameIdx, typeIdx);
      if (propDesc) schema.description = propDesc;

      // 親へ追加
      addChildProperty(parentSchema, name, schema);

      // required は「その親オブジェクト」に追加（配列なら最内側 object に追加）
      const required = detectRequired(row);
      addRequiredIfNeeded(parentSchema, name, required);

      // 子を持ち得る場合は stack に積む（object / array(itemsがobject/array)）
      if (canHaveChildren(schema)) {
        stack.push({ depth, schema });
      }
    }

    // required が空なら掃除（全階層）
    const cleanupRequired = (schema) => {
      if (!schema || typeof schema !== "object") return;

      if (Array.isArray(schema.required) && schema.required.length === 0) {
        delete schema.required;
      }

      if (schema.type === "object" && schema.properties) {
        for (const k of Object.keys(schema.properties)) cleanupRequired(schema.properties[k]);
      }

      if (schema.type === "array" && schema.items) {
        cleanupRequired(schema.items);
      }
    };

    for (const ep of endpoints) {
      if (ep.requestBody) cleanupRequired(ep.requestBody);
      if (ep.responseBody) cleanupRequired(ep.responseBody);
    }

    return { endpoints };
  } finally {
    logger.debug("parseDesignCsvToJson end");
  }
};

/**
 * config から処理対象を列挙して api_design.json を生成する
 * @returns {Promise<void>}
 */
const main = async () => {
  logger.info("main start");
  try {
    const configs = Array.isArray(configData) ? configData : [configData];
    if (!configs || configs.length === 0) {
      logger.error("config が見つかりません。../config/config.json を確認してください。");
      process.exitCode = 1;
      return;
    }

    for (const cfg of configs) {
      const apiName = toStrOrNull(cfg.apiName) || "api";
      const apiDetailsPathRaw = toStrOrNull(cfg.apiDetailsPath);

      if (!apiDetailsPathRaw) {
        logger.warn(`[${apiName}] apiDetailsPath が未設定のためスキップします。`);
        continue;
      }

      const csvPath = expandTilde(apiDetailsPathRaw);
      logger.debug("csvPath: " + csvPath);

      if (!fs.existsSync(csvPath)) {
        logger.warn(`[${apiName}] CSV が見つかりません: ${csvPath}`);
        continue;
      }

      // output 設定（※図2と同じ形式を維持）
      const outputDir = path.resolve(__dirname, "..", "output", apiName);
      ensureDir(outputDir);

      const outFile = path.join(outputDir, "api_design.json");

      logger.info(`[${apiName}] CSV 読み込み: ${csvPath}`);
      const csvText = fs.readFileSync(csvPath, "utf-8");

      logger.info(`[${apiName}] CSV 解析開始`);
      const json = parseDesignCsvToJson(csvText);

      const payload = {
        apiName,
        title: toStrOrNull(cfg.title) || "",
        description: toStrOrNull(cfg.description) || "",
        url: toStrOrNull(cfg.url) || "",
        generatedAt: new Date().toISOString(),
        ...json,
      };

      fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
      logger.info(`[${apiName}] api_design.json を生成しました: ${outFile}`);
    }

    logger.info("main end");
  } catch (e) {
    logger.error(`main error: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1;
  }
};

main();

