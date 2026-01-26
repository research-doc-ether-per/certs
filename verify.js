/**
 * design-csv-to-json.js
 * API設計CSV（Excel出力のレイアウト型）を解析し、api_design.json を生成する
 *
 * - config から apiDetailsPath（CSV）と outputPath を取得
 * - ~/ で始まるパスはホームディレクトリに展開
 * - requestBody / responseBody の多階層プロパティを再帰的に推測して JSON 化
 *
 * 生成物:
 *   <outputPath>/<apiName>/api_design.json
 */

const log4js = require("log4js");
const fs = require("fs");
const path = require("path");
const os = require("os");

// config は配列でも単体でも許容（あなたのスクショは配列）
const configData = require("../config/config.json");

let log4jsConfig;
try {
  // tools/swagger/config/log4js.json がある前提（あなたの既存構成）
  log4jsConfig = require("../config/log4js.json");
} catch (e) {
  // 無い場合でも落ちないように最低限の設定を用意
  log4jsConfig = {
    appenders: { out: { type: "stdout" } },
    categories: { default: { appenders: ["out"], level: "info" } },
  };
}

/**
 * ロガー初期化
 */
const initLogger = () => {
  const fileName = "design-csv-to-json";

  // ファイル appender が存在する場合はログファイル名を差し替え
  if (log4jsConfig.appenders && log4jsConfig.appenders.file) {
    const logsDir = path.resolve(__dirname, "..", "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    log4jsConfig.appenders.file.filename = path.join(logsDir, `${fileName}.log`);
  }

  log4js.configure(log4jsConfig);
  return log4js.getLogger(fileName);
};

const logger = initLogger();

/**
 * 文字列をトリムして空なら null にする
 * @param {string} v
 * @returns {string|null}
 */
const toStrOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
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
      // 末尾の \r を軽く吸収
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

    // 最終セル
    pushCell();
    // 最終行（空行でも入るが後段で掃除する）
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
 * タイプ文字列を OpenAPI 風の schema に寄せて解釈する
 * 許容例:
 * - string, integer, number, boolean, object
 * - object[], string[]
 * - array<object>, array<string>
 * - Array<string>, Array< string >
 * @param {string|null} rawType
 * @returns {{ type: string, items?: any }}
 */
const parseTypeToSchema = (rawType) => {
  logger.debug("parseTypeToSchema start");
  try {
    const t0 = (toStrOrNull(rawType) || "object").trim();

    const t = t0
      .replace(/\s+/g, "")
      .replace(/^Array</i, "array<")
      .replace(/>$/i, ">");

    const normalizeScalar = (x) => {
      const v = x.toLowerCase();
      if (v === "int" || v === "integer") return "integer";
      if (v === "number" || v === "float" || v === "double.breakpoints") return "number";
      if (v === "bool" || v === "boolean") return "boolean";
      if (v === "string") return "string";
      if (v === "object") return "object";
      // 例: "object[]" はここには来ない
      return "object";
    };

    // string[] / object[]
    const arrSuffix = t.match(/^(.+)\[\]$/);
    if (arrSuffix) {
      const itemType = normalizeScalar(arrSuffix[1]);
      if (itemType === "object") {
        return { type: "array", items: { type: "object", properties: {} } };
      }
      return { type: "array", items: { type: itemType } };
    }

    // array<string> / array<object>
    const arrGeneric = t.match(/^array<(.+)>$/i);
    if (arrGeneric) {
      const inner = arrGeneric[1];
      const itemType = normalizeScalar(inner);
      if (itemType === "object") {
        return { type: "array", items: { type: "object", properties: {} } };
      }
      return { type: "array", items: { type: itemType } };
    }

    // object[]（Excel で object[] と書かれるケース）
    if (t.toLowerCase() === "object[]") {
      return { type: "array", items: { type: "object", properties: {} } };
    }

    // array<object> の別表記として object[] が来ることもあるが上で処理済み
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
    // 例: "プロパティ|説明|型|必須"
    const hasProp = joined.includes("プロパティ") || joined.toLowerCase().includes("property");
    const hasType = joined.includes("型") || joined.toLowerCase().includes("type");
    return hasProp && hasType;
  } finally {
    logger.debug("isPropertyTableHeaderRow end");
  }
};

/**
 * 行から "型" っぽいセル index を探す（右側にある想定）
 * @param {string[]} row
 * @returns {number}
 */
const findTypeCellIndex = (row) => {
  logger.debug("findTypeCellIndex start");
  try {
    const typeLike = (s) => {
      const v = (toStrOrNull(s) || "").trim();
      if (!v) return false;

      const vv = v.toLowerCase().replace(/\s+/g, "");
      // 許容する型表記
      if (["string", "integer", "number", "boolean", "object"].includes(vv)) return true;
      if (vv === "object[]") return true;
      if (/^array<.+>$/.test(vv)) return true;
      if (/^.+\[\]$/.test(vv)) return true;
      if (/^Array<.+>$/.test(v)) return true; // 元の大文字も念のため
      return false;
    };

    // 右から探す（型列は右側にあることが多い）
    for (let i = row.length - 1; i >= 0; i--) {
      if (typeLike(row[i])) return i;
    }
    return -1;
  } finally {
    logger.debug("findTypeCellIndex end");
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
      const v = toStrOrNull(c);
      if (!v) continue;
      if (v === "○" || v.toLowerCase() === "required" || v === "必須") return true;
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
    // typeIdx より左で一番右にある非空セルを name とする
    for (let i = typeIdx - 1; i >= 0; i--) {
      const v = toStrOrNull(row[i]);
      if (!v) continue;

      // ヘッダ文字は除外
      const vv = v.toLowerCase();
      if (vv === "プロパティ" || vv === "property" || vv === "説明" || vv === "description") continue;

      return { name: v, nameIdx: i };
    }
    return { name: null, nameIdx: -1 };
  } finally {
    logger.debug("extractPropertyName end");
  }
};

/**
 * 説明（description）候補を抽出する
 * - name と type の間、または type の左側で最も右にあるテキストを採用
 * @param {string[]} row
 * @param {number} nameIdx
 * @param {number} typeIdx
 * @returns {string|null}
 */
const extractDescription = (row, nameIdx, typeIdx) => {
  logger.debug("extractDescription start");
  try {
    const start = Math.max(0, nameIdx + 1);
    const end = Math.max(start, typeIdx);
    for (let i = end - 1; i >= start; i--) {
      const v = toStrOrNull(row[i]);
      if (!v) continue;
      // 型っぽいものは除外
      if (findTypeCellIndex([v]) === 0) continue;
      return v;
    }
    return null;
  } finally {
    logger.debug("extractDescription end");
  }
};

/**
 * スキーマへ子プロパティを追加する
 * @param {object} parentSchema
 * @param {string} name
 * @param {object} childSchema
 * @returns {void}
 */
const addChildProperty = (parentSchema, name, childSchema) => {
  logger.debug("addChildProperty start");
  try {
    if (!parentSchema || !name) return;

    if (parentSchema.type === "object") {
      if (!parentSchema.properties) parentSchema.properties = {};
      parentSchema.properties[name] = childSchema;
      return;
    }

    if (parentSchema.type === "array") {
      // items が object であることを前提に詰める
      if (!parentSchema.items) parentSchema.items = { type: "object", properties: {} };
      if (parentSchema.items.type !== "object") {
        // items が string などの場合、子が来たら object として扱う（設計側がネストを持っている想定）
        parentSchema.items = { type: "object", properties: {} };
      }
      if (!parentSchema.items.properties) parentSchema.items.properties = {};
      parentSchema.items.properties[name] = childSchema;
    }
  } finally {
    logger.debug("addChildProperty end");
  }
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

    if (rows.length === 0) {
      return { endpoints: [] };
    }

    // 先頭付近からヘッダ行を探す（description/api/method を含む行）
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
    let currentSection = null; // requestBody / responseBody

    // プロパティテーブルの基準列（nameIdx の最小）を section ごとに推測
    let baseNameIdx = null;

    // ネスト管理（depth, schema）
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
        if (!current.requestBody) current.requestBody = { type: "object", properties: {}, required: [] };
        return current.requestBody;
      }
      if (sectionKey === "responseBody") {
        if (!current.responseBody) current.responseBody = { type: "object", properties: {}, required: [] };
        return current.responseBody;
      }
      return null;
    };

    const addRequiredIfNeeded = (root, propName, isRequired) => {
      if (!root || !propName || !isRequired) return;
      if (!Array.isArray(root.required)) root.required = [];
      if (!root.required.includes(propName)) root.required.push(propName);
    };

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];

      // endpoint 行判定：api と method が揃っている
      const apiVal = toStrOrNull(row[apiIdx]);
      const methodVal = toStrOrNull(row[methodIdx]);
      const descVal = toStrOrNull(row[descIdx]);

      // 新しい endpoint 開始
      if (apiVal && methodVal) {
        startNewEndpoint(descVal, apiVal, methodVal);
        continue;
      }

      // endpoint 未開始ならスキップ
      if (!current) continue;

      // requestBody/responseBody セクション判定
      const section = detectBodySection(row);
      if (section) {
        currentSection = section;
        resetPropertyParsingState();
        // root schema を確保
        ensureSectionRootSchema(section);
        continue;
      }

      // セクション外の行は無視
      if (!currentSection) continue;

      // プロパティ表のヘッダ行は無視（ただし baseNameIdx リセット）
      if (isPropertyTableHeaderRow(row)) {
        resetPropertyParsingState();
        continue;
      }

      // "none" 行は「ボディ無し」の意味として扱う
      const joinedLower = row.map((c) => (toStrOrNull(c) || "").toLowerCase()).join("|");
      if (joinedLower.includes("none")) {
        // requestBody/responseBody が none の場合は null 扱い
        if (currentSection === "requestBody") current.requestBody = null;
        if (currentSection === "responseBody") current.responseBody = null;
        resetPropertyParsingState();
        continue;
      }

      // 型列を探す（型が無い行はスキップ）
      const typeIdx = findTypeCellIndex(row);
      if (typeIdx < 0) continue;

      const { name, nameIdx } = extractPropertyName(row, typeIdx);
      if (!name || nameIdx < 0) continue;

      // baseNameIdx を決める（最初に出現した nameIdx を基準）
      if (baseNameIdx === null) baseNameIdx = nameIdx;

      // depth を列位置から推測（右に行くほどネストが深い）
      const depth = Math.max(0, nameIdx - baseNameIdx);

      // ルートスキーマ
      const root = ensureSectionRootSchema(currentSection);
      if (!root) continue;

      // 親を決める（stack の depth を見て戻す）
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }

      const parentSchema = stack.length === 0 ? root : stack[stack.length - 1].schema;

      const propDesc = extractDescription(row, nameIdx, typeIdx);
      const required = detectRequired(row);

      const schema = parseTypeToSchema(row[typeIdx]);
      if (propDesc) schema.description = propDesc;

      // 親へ追加
      addChildProperty(parentSchema, name, schema);

      // required は「セクション直下」の required に集約（深い required は現状は保持しない）
      if (stack.length === 0) addRequiredIfNeeded(root, name, required);

      // 子がぶら下がり得る schema は stack に積む
      // - object
      // - array(items が object)
      const canHaveChildren =
        schema.type === "object" ||
        (schema.type === "array" && schema.items && schema.items.type === "object");

      if (canHaveChildren) {
        stack.push({ depth, schema });
      }
    }

    // required が空なら削除して軽量化
    for (const ep of endpoints) {
      if (ep.requestBody && Array.isArray(ep.requestBody.required) && ep.requestBody.required.length === 0) {
        delete ep.requestBody.required;
      }
      if (ep.responseBody && Array.isArray(ep.responseBody.required) && ep.responseBody.required.length === 0) {
        delete ep.responseBody.required;
      }
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
      const outputPathRaw = toStrOrNull(cfg.outputPath);

      if (!apiDetailsPathRaw) {
        logger.warn(`[${apiName}] apiDetailsPath が未設定のためスキップします。`);
        continue;
      }
      if (!outputPathRaw) {
        logger.warn(`[${apiName}] outputPath が未設定のためスキップします。`);
        continue;
      }

      const csvPath = expandTilde(apiDetailsPathRaw);
      const outputBase = expandTilde(outputPathRaw);

      if (!fs.existsSync(csvPath)) {
        logger.warn(`[${apiName}] CSV が見つかりません: ${csvPath}`);
        continue;
      }

      // output: <outputPath>/<apiName>/api_design.json
      const outDir = path.join(outputBase, apiName);
      ensureDir(outDir);

      const outFile = path.join(outDir, "api_design.json");

      logger.info(`[${apiName}] CSV 読み込み: ${csvPath}`);
      const csvText = fs.readFileSync(csvPath, "utf-8");

      logger.info(`[${apiName}] CSV 解析開始`);
      const json = parseDesignCsvToJson(csvText);

      // メタ情報も付与（後段 patch に使いやすくする）
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
