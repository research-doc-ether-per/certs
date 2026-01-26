const log4js = require("log4js");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const configData = require("../config/config.json");

const log4jsConfig = require("../../config/log4js.json");

// ログ設定
const fileName = "patch-openapi-from-design";
log4jsConfig.appenders.file.filename = `../logs/${fileName}.log`;
log4js.configure(log4jsConfig);
const logger = log4js.getLogger(`${fileName}`);

/**
 * 文字列をトリムして空なら null にする
 * @param {any} v
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
 * YAML ファイルを読み込む
 * @param {string} filePath
 * @returns {any}
 */
const readYaml = (filePath) => {
  logger.debug("readYaml start");
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    return YAML.parse(text);
  } finally {
    logger.debug("readYaml end");
  }
};

/**
 * YAML ファイルを書き込む
 * @param {string} filePath
 * @param {any} obj
 * @returns {void}
 */
const writeYaml = (filePath, obj) => {
  logger.debug("writeYaml start");
  try {
    const text = YAML.stringify(obj);
    fs.writeFileSync(filePath, text, "utf-8");
  } finally {
    logger.debug("writeYaml end");
  }
};

/**
 * JSON を読み込む
 * @param {string} filePath
 * @returns {any}
 */
const readJson = (filePath) => {
  logger.debug("readJson start");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } finally {
    logger.debug("readJson end");
  }
};

/**
 * :id -> {id}
 * @param {string} p
 * @returns {string}
 */
const toOpenApiParamStyle = (p) => {
  const s = toStrOrNull(p) || "";
  return s.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
};

/**
 * {id} -> :id
 * @param {string} p
 * @returns {string}
 */
const toExpressParamStyle = (p) => {
  const s = toStrOrNull(p) || "";
  return s.replace(/\{([A-Za-z0-9_]+)\}/g, ":$1");
};

/**
 * method を openapi 側のキーに正規化（get/post/...）
 * @param {string|null} m
 * @returns {string}
 */
const normalizeMethodKey = (m) => {
  const s = (toStrOrNull(m) || "").toLowerCase();
  return s;
};

/**
 * OpenAPI の operation を 찾く（path + method）
 * - パス表記差異（:id / {id}）を考慮して複数パターンで探索
 * @param {any} openapi
 * @param {string} apiPath
 * @param {string} methodKey
 * @returns {{ pathKey: string, operation: any } | null}
 */
const findOperation = (openapi, apiPath, methodKey) => {
  logger.debug("findOperation start");
  try {
    if (!openapi || !openapi.paths) return null;

    const p0 = toStrOrNull(apiPath);
    if (!p0) return null;

    const candidates = [
      p0,
      toOpenApiParamStyle(p0),
      toExpressParamStyle(p0),
    ].filter(Boolean);

    for (const p of candidates) {
      const pathItem = openapi.paths[p];
      if (!pathItem) continue;
      const op = pathItem[methodKey];
      if (op) return { pathKey: p, operation: op };
    }

    return null;
  } finally {
    logger.debug("findOperation end");
  }
};

/**
 * JSON schema を OpenAPI requestBody content へセット
 * @param {any} schema
 * @returns {any}
 */
const toJsonContent = (schema) => {
  return {
    "application/json": {
      schema,
    },
  };
};

/**
 * endpoint 設計を OpenAPI operation に反映する
 * @param {any} operation
 * @param {{ description?: string, requestBody?: any, responseBody?: any }} ep
 * @returns {void}
 */
const patchOperation = (operation, ep) => {
  logger.debug("patchOperation start");
  try {
    const desc = toStrOrNull(ep.description) || "";

    // summary/description
    operation.summary = desc;
    operation.description = desc;

    // requestBody
    if (ep.requestBody === null || ep.requestBody === undefined) {
      delete operation.requestBody;
    } else {
      operation.requestBody = {
        required: true,
        content: toJsonContent(ep.requestBody),
      };
    }

    // response 200
    operation.responses = operation.responses || {};

    const respSchema =
      ep.responseBody === null || ep.responseBody === undefined
        ? { type: "object" }
        : ep.responseBody;

    operation.responses["200"] = {
      description: operation.responses["200"]?.description || "OK",
      content: toJsonContent(respSchema),
    };
  } finally {
    logger.debug("patchOperation end");
  }
};

/**
 * openapi の最低限項目を保証する
 * @param {any} openapi
 * @returns {any}
 */
const ensureOpenApiMinimum = (openapi) => {
  logger.debug("ensureOpenApiMinimum start");
  try {
    const doc = openapi || {};
    doc.openapi = doc.openapi || "3.0.3";
    doc.info = doc.info || { title: "API", version: "1.0.0" };
    doc.paths = doc.paths || {};
    doc.components = doc.components || {};
    return doc;
  } finally {
    logger.debug("ensureOpenApiMinimum end");
  }
};

/**
 * 実行本体
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
      const outputDir = path.resolve(__dirname, "..", "output", apiName);
      ensureDir(outputDir);

      const autoYamlPath = path.join(outputDir, "openapi_auto.yaml");
      const designJsonPath = path.join(outputDir, "api_design.json");
      const updatedYamlPath = path.join(outputDir, "openapi_updated.yaml");

      if (!fs.existsSync(autoYamlPath)) {
        logger.warn(`[${apiName}] openapi_auto.yaml が見つかりません: ${autoYamlPath}`);
        logger.warn(`[${apiName}] 先に gen-openapi-auto.js を実行してください。`);
        continue;
      }

      if (!fs.existsSync(designJsonPath)) {
        logger.warn(`[${apiName}] api_design.json が見つかりません: ${designJsonPath}`);
        logger.warn(`[${apiName}] 先に design-csv-to-json.js を実行してください。`);
        continue;
      }

      logger.info(`[${apiName}] openapi_auto.yaml 読み込み: ${autoYamlPath}`);
      const openapi = ensureOpenApiMinimum(readYaml(autoYamlPath));

      logger.info(`[${apiName}] api_design.json 読み込み: ${designJsonPath}`);
      const design = readJson(designJsonPath);

      const endpoints = Array.isArray(design.endpoints) ? design.endpoints : [];
      if (endpoints.length === 0) {
        logger.warn(`[${apiName}] endpoints が空です。更新は行いません。`);
        // それでも updated を出しておく（差分確認しやすい）
        writeYaml(updatedYamlPath, openapi);
        logger.info(`[${apiName}] openapi_updated.yaml を出力しました: ${updatedYamlPath}`);
        continue;
      }

      let patchedCount = 0;
      const missed = [];

      for (const ep of endpoints) {
        const apiPath = toStrOrNull(ep.api);
        const methodKey = normalizeMethodKey(ep.method);

        if (!apiPath || !methodKey) {
          missed.push({ api: apiPath || "", method: (ep.method || "").toString() });
          continue;
        }

        const found = findOperation(openapi, apiPath, methodKey);
        if (!found) {
          missed.push({ api: apiPath, method: methodKey.toUpperCase() });
          continue;
        }

        patchOperation(found.operation, ep);
        patchedCount += 1;
      }

      logger.info(`[${apiName}] patch 件数: ${patchedCount}`);
      if (missed.length > 0) {
        logger.warn(`[${apiName}] 未一致（path+method が見つからない）: ${missed.length} 件`);
        for (const m of missed) {
          logger.warn(` - ${m.method} ${m.api}`);
        }
      }

      logger.info(`[${apiName}] openapi_updated.yaml 出力: ${updatedYamlPath}`);
      writeYaml(updatedYamlPath, openapi);

      logger.info(`[${apiName}] 完了`);
    }

    logger.info("main end");
  } catch (e) {
    logger.error(`main error: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1;
  }
};

main();
