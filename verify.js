/**
 * patch-openapi-from-design.js
 *
 * 目的:
 * - gen-openapi-auto.js が生成した openapi_auto.yaml を読み込む
 * - design-csv-to-json.js が生成した api_design.json を読み込む
 * - 追加で api_errors.json / errorMessages.json を読み込む
 * - API 定義が一致する場合、description / requestBody / responseBody / error responses を更新する
 * - 結果を openapi_updated.yaml として outputPath 配下に出力する
 *
 * 方針（ユーザー要件）:
 * - 成功系レスポンス(200)は基本的に空オブジェクト {} を返す API が多い（ただし design 側に定義があれば優先）
 * - auto 側で 201/204 があるので、更新時は status を見て responseBody を入れる/入れないを判断する
 *   - 204 はボディなし
 *   - 201 はボディあり得る（design に定義があれば入れる）
 * - エラーは「方案B」:
 *   - openapi_updated.yaml の responses の該当 status（例: 401/403/400/500）に対して
 *   - schema は常に $ref: "#/components/schemas/ErrorResponse"
 *   - examples は errorMessages.json の "error key" 単位で複数登録できるようにする
 *   - 401 が複数ある場合も同様に、examples に複数キーを並べる
 * - detail は存在する場合のみ examples.value に含める（存在しない場合は出力しない）
 */

const log4js = require("log4js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const yaml = require("yaml"); // npm i yaml
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
 * JSON を安全に読み込む
 * @param {string} filePath
 * @returns {any|null}
 */
const readJsonIfExists = (filePath) => {
  logger.debug("readJsonIfExists start");
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const txt = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(txt);
  } catch (e) {
    logger.warn(`JSON 読み込み失敗: ${filePath} - ${e && e.message ? e.message : e}`);
    return null;
  } finally {
    logger.debug("readJsonIfExists end");
  }
};

/**
 * YAML を安全に読み込む
 * @param {string} filePath
 * @returns {any|null}
 */
const readYamlIfExists = (filePath) => {
  logger.debug("readYamlIfExists start");
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const txt = fs.readFileSync(filePath, "utf-8");
    return yaml.parse(txt);
  } catch (e) {
    logger.warn(`YAML 読み込み失敗: ${filePath} - ${e && e.message ? e.message : e}`);
    return null;
  } finally {
    logger.debug("readYamlIfExists end");
  }
};

/**
 * YAML を書き込む（yaml ライブラリで整形）
 * @param {string} filePath
 * @param {any} doc
 * @returns {void}
 */
const writeYaml = (filePath, doc) => {
  logger.debug("writeYaml start");
  try {
    const txt = yaml.stringify(doc);
    fs.writeFileSync(filePath, txt, "utf-8");
  } finally {
    logger.debug("writeYaml end");
  }
};

/**
 * パスの正規化（/wallets/user/{userId} のようなテンプレ対応）
 * - 余分な空白を除去
 * - 末尾スラッシュを除去
 * @param {string} p
 * @returns {string}
 */
const normalizeApiPath = (p) => {
  logger.debug("normalizeApiPath start");
  try {
    const s = (toStrOrNull(p) || "").trim();
    if (!s) return "";
    return s.endsWith("/") && s.length > 1 ? s.slice(0, -1) : s;
  } finally {
    logger.debug("normalizeApiPath end");
  }
};

/**
 * method の正規化
 * @param {string} m
 * @returns {string}
 */
const normalizeMethod = (m) => {
  logger.debug("normalizeMethod start");
  try {
    return (toStrOrNull(m) || "").toUpperCase();
  } finally {
    logger.debug("normalizeMethod end");
  }
};

/**
 * OpenAPI の responses オブジェクトから「成功系 status」を推測
 * - 優先順: 200 > 201 > 204
 * @param {any} responses
 * @returns {string|null}
 */
const detectPrimarySuccessStatus = (responses) => {
  logger.debug("detectPrimarySuccessStatus start");
  try {
    if (!responses || typeof responses !== "object") return null;
    if (responses["200"]) return "200";
    if (responses["201"]) return "201";
    if (responses["204"]) return "204";
    return null;
  } finally {
    logger.debug("detectPrimarySuccessStatus end");
  }
};

/**
 * schema を OpenAPI 用に整形する
 * - design 側は {type, properties, items, required, description} を持つ想定
 * @param {any} schema
 * @returns {any}
 */
const normalizeSchemaForOpenApi = (schema) => {
  logger.debug("normalizeSchemaForOpenApi start");
  try {
    if (!schema || typeof schema !== "object") return null;

    const copy = JSON.parse(JSON.stringify(schema));

    const walk = (node) => {
      if (!node || typeof node !== "object") return;

      if (node.type === "object") {
        if (!node.properties) node.properties = {};
        for (const k of Object.keys(node.properties)) walk(node.properties[k]);
      }

      if (node.type === "array") {
        if (!node.items) node.items = { type: "object", properties: {} };
        walk(node.items);
      }

      if (Array.isArray(node.required) && node.required.length === 0) {
        delete node.required;
      }
    };

    walk(copy);
    return copy;
  } finally {
    logger.debug("normalizeSchemaForOpenApi end");
  }
};

/**
 * requestBody を上書きする
 * @param {any} op
 * @param {any|null} requestSchema
 * @returns {void}
 */
const applyRequestBody = (op, requestSchema) => {
  logger.debug("applyRequestBody start");
  try {
    if (!op) return;

    if (!requestSchema) {
      delete op.requestBody;
      return;
    }

    const schema = normalizeSchemaForOpenApi(requestSchema);

    op.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema,
        },
      },
    };
  } finally {
    logger.debug("applyRequestBody end");
  }
};

/**
 * 成功系 responseBody を上書きする
 * - 204 の場合は body を付けない
 * - 200 の場合:
 *   - design に schema があればそれを使う
 *   - design に schema が無ければ {}（type: object, properties: {}）にする
 * - 201 の場合:
 *   - design に schema があればそれを使う
 *   - 無ければ既存を維持（無理に {} へはしない）
 * @param {any} op
 * @param {string|null} successStatus
 * @param {any|null} responseSchema
 * @returns {void}
 */
const applySuccessResponseBody = (op, successStatus, responseSchema) => {
  logger.debug("applySuccessResponseBody start");
  try {
    if (!op || !successStatus) return;

    if (!op.responses || typeof op.responses !== "object") op.responses = {};
    if (!op.responses[successStatus]) op.responses[successStatus] = { description: "Success" };

    const res = op.responses[successStatus];

    if (successStatus === "204") {
      delete res.content;
      if (!res.description) res.description = "No Content";
      return;
    }

    if (successStatus === "200") {
      const schema = responseSchema
        ? normalizeSchemaForOpenApi(responseSchema)
        : { type: "object", properties: {} };

      res.content = {
        "application/json": {
          schema,
        },
      };
      if (!res.description) res.description = "OK";
      return;
    }

    if (successStatus === "201") {
      if (!responseSchema) {
        // 201 は body が無い API もあり得るため、design が無い場合は既存を維持
        if (!res.description) res.description = "Created";
        return;
      }

      const schema = normalizeSchemaForOpenApi(responseSchema);
      res.content = {
        "application/json": {
          schema,
        },
      };
      if (!res.description) res.description = "Created";
      return;
    }
  } finally {
    logger.debug("applySuccessResponseBody end");
  }
};

/**
 * エラー定義（errorMessages.json）から status と example value を作る
 * - detail は存在する場合のみ含める
 * @param {any} errorMessages
 * @param {string} errorKey
 * @returns {{ status: string, exampleValue: any }|null}
 */
const buildErrorExampleFromErrorMessages = (errorMessages, errorKey) => {
  logger.debug("buildErrorExampleFromErrorMessages start");
  try {
    if (!errorMessages || typeof errorMessages !== "object") return null;
    const def = errorMessages[errorKey];
    if (!def || typeof def !== "object") return null;

    const statusNum = def.status;
    const statusStr = statusNum !== undefined && statusNum !== null ? String(statusNum) : null;

    const err = def.error || {};
    const code = err.code;
    const message = err.message;

    if (code === undefined || code === null || !message) {
      return statusStr ? { status: statusStr, exampleValue: null } : null;
    }

    const exampleValue = {
      code,
      message,
    };

    const detail = err.detail;
    if (detail !== undefined && detail !== null && String(detail).trim().length > 0) {
      exampleValue.detail = detail;
    }

    return {
      status: statusStr,
      exampleValue,
    };
  } finally {
    logger.debug("buildErrorExampleFromErrorMessages end");
  }
};

/**
 * エラーレスポンスを OpenAPI operation に反映する（方案B）
 * - schema は常に ErrorResponse を参照
 * - examples は errorKey ごとに複数登録
 * - 同じ status（例: 401）で複数 errorKey があっても、examples に複数追加する
 * @param {any} op
 * @param {string[]} errorKeys
 * @param {any} errorMessages
 * @returns {void}
 */
const applyErrorResponses = (op, errorKeys, errorMessages) => {
  logger.debug("applyErrorResponses start");
  try {
    if (!op || !Array.isArray(errorKeys) || errorKeys.length === 0) return;

    if (!op.responses || typeof op.responses !== "object") op.responses = {};

    const byStatus = new Map();

    for (const k of errorKeys) {
      const errorKey = toStrOrNull(k);
      if (!errorKey) continue;

      const built = buildErrorExampleFromErrorMessages(errorMessages, errorKey);
      if (!built || !built.status || !built.exampleValue) continue;

      const status = built.status;
      if (!byStatus.has(status)) byStatus.set(status, []);
      byStatus.get(status).push({ errorKey, exampleValue: built.exampleValue });
    }

    for (const [status, items] of byStatus.entries()) {
      if (!op.responses[status]) {
        op.responses[status] = {
          description: `Error ${status}`,
        };
      }

      const res = op.responses[status];

      res.content = res.content || {};
      res.content["application/json"] = res.content["application/json"] || {};
      res.content["application/json"].schema = {
        $ref: "#/components/schemas/ErrorResponse",
      };

      const examples = {};
      for (const it of items) {
        examples[it.errorKey] = {
          value: it.exampleValue,
        };
      }

      res.content["application/json"].examples = examples;
    }
  } finally {
    logger.debug("applyErrorResponses end");
  }
};

/**
 * components.schemas.ErrorResponse を保証する
 * @param {any} openapi
 * @returns {void}
 */
const ensureErrorResponseSchema = (openapi) => {
  logger.debug("ensureErrorResponseSchema start");
  try {
    if (!openapi.components) openapi.components = {};
    if (!openapi.components.schemas) openapi.components.schemas = {};

    if (!openapi.components.schemas.ErrorResponse) {
      openapi.components.schemas.ErrorResponse = {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
            description: "エラーコード",
          },
          message: {
            type: "string",
            description: "エラーメッセージ",
          },
          detail: {
            type: "string",
            nullable: true,
            description: "追加情報（存在する場合のみ）",
          },
        },
      };
    } else {
      // ユーザー指定の形を維持しつつ、足りない項目だけ補完
      const er = openapi.components.schemas.ErrorResponse;
      if (!er.type) er.type = "object";
      if (!Array.isArray(er.required)) er.required = ["code", "message"];
      if (!er.required.includes("code")) er.required.push("code");
      if (!er.required.includes("message")) er.required.push("message");

      if (!er.properties) er.properties = {};
      if (!er.properties.code) {
        er.properties.code = { type: "integer", format: "int32", description: "エラーコード" };
      }
      if (!er.properties.message) {
        er.properties.message = { type: "string", description: "エラーメッセージ" };
      }
      if (!er.properties.detail) {
        er.properties.detail = {
          type: "string",
          nullable: true,
          description: "追加情報（存在する場合のみ）",
        };
      }
    }
  } finally {
    logger.debug("ensureErrorResponseSchema end");
  }
};

/**
 * design endpoints を (method,path) で map 化
 * @param {any} designJson
 * @returns {Map<string, any>}
 */
const buildDesignMap = (designJson) => {
  logger.debug("buildDesignMap start");
  try {
    const m = new Map();
    const eps = designJson && Array.isArray(designJson.endpoints) ? designJson.endpoints : [];
    for (const ep of eps) {
      const api = normalizeApiPath(ep.api);
      const method = normalizeMethod(ep.method);
      if (!api || !method) continue;
      m.set(`${method} ${api}`, ep);
    }
    return m;
  } finally {
    logger.debug("buildDesignMap end");
  }
};

/**
 * api_errors.json を (method,path) で map 化
 * @param {any} apiErrors
 * @returns {Map<string, string[]>}
 */
const buildApiErrorsMap = (apiErrors) => {
  logger.debug("buildApiErrorsMap start");
  try {
    const m = new Map();
    const list = Array.isArray(apiErrors) ? apiErrors : [];
    for (const item of list) {
      const api = normalizeApiPath(item.api);
      const method = normalizeMethod(item.method);
      if (!api || !method) continue;
      const errs = Array.isArray(item.errors) ? item.errors : [];
      m.set(`${method} ${api}`, errs);
    }
    return m;
  } finally {
    logger.debug("buildApiErrorsMap end");
  }
};

/**
 * OpenAPI paths を走査して design を反映する
 * @param {any} openapi
 * @param {Map<string, any>} designMap
 * @param {Map<string, string[]>} apiErrorsMap
 * @param {any} errorMessages
 * @returns {{ updatedCount: number }}
 */
const patchOpenApi = (openapi, designMap, apiErrorsMap, errorMessages) => {
  logger.debug("patchOpenApi start");
  try {
    let updatedCount = 0;

    if (!openapi.paths || typeof openapi.paths !== "object") {
      return { updatedCount };
    }

    for (const rawPath of Object.keys(openapi.paths)) {
      const pathItem = openapi.paths[rawPath];
      if (!pathItem || typeof pathItem !== "object") continue;

      const normalizedPath = normalizeApiPath(rawPath);

      const methods = ["get", "post", "put", "patch", "delete", "options", "head"];
      for (const m of methods) {
        const op = pathItem[m];
        if (!op) continue;

        const methodUpper = m.toUpperCase();
        const key = `${methodUpper} ${normalizedPath}`;

        const design = designMap.get(key);
        if (!design) continue;

        // description 更新
        const desc = toStrOrNull(design.description);
        if (desc) {
          op.summary = desc;
          op.description = desc;
        }

        // requestBody 更新
        applyRequestBody(op, design.requestBody);

        // success response 更新
        const successStatus = detectPrimarySuccessStatus(op.responses);
        applySuccessResponseBody(op, successStatus, design.responseBody);

        // error responses 更新（方案B）
        const errs = apiErrorsMap.get(key) || [];
        applyErrorResponses(op, errs, errorMessages);

        updatedCount++;
      }
    }

    return { updatedCount };
  } finally {
    logger.debug("patchOpenApi end");
  }
};

/**
 * メイン
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
      const outputPathRaw = toStrOrNull(cfg.outputPath);
      if (!outputPathRaw) {
        logger.warn(`[${apiName}] outputPath が未設定のためスキップします。`);
        continue;
      }

      const outputDir = expandTilde(outputPathRaw);
      ensureDir(outputDir);

      const autoPath = path.join(outputDir, "openapi_auto.yaml");
      const updatedPath = path.join(outputDir, "openapi_updated.yaml");

      if (!fs.existsSync(autoPath)) {
        logger.warn(`[${apiName}] openapi_auto.yaml が見つかりません: ${autoPath}`);
        continue;
      }

      // design-csv-to-json.js の出力
      const designJsonPath = path.join(outputDir, "api_design.json");
      if (!fs.existsSync(designJsonPath)) {
        logger.warn(`[${apiName}] api_design.json が見つかりません: ${designJsonPath}`);
        continue;
      }

      // エラー関連（ユーザー指定: output/api_errors.json を読む）
      // - api_errors.json は output 配下共通の可能性があるため tools/swagger/output 直下も探す
      const outputRoot = path.resolve(__dirname, "..", "output");
      const apiErrorsCandidate1 = path.join(outputDir, "api_errors.json");
      const apiErrorsCandidate2 = path.join(outputRoot, "api_errors.json");
      const apiErrorsPath = fs.existsSync(apiErrorsCandidate1) ? apiErrorsCandidate1 : apiErrorsCandidate2;

      // errorMessages.json は services 側にある（cfg.errorMessagesPath）
      const errorMessagesPathRaw = toStrOrNull(cfg.errorMessagesPath);
      const errorMessagesPath = expandTilde(errorMessagesPathRaw || "");
      const errorMessages = readJsonIfExists(errorMessagesPath) || {};

      logger.info(`[${apiName}] openapi_auto.yaml 読み込み: ${autoPath}`);
      const openapi = readYamlIfExists(autoPath);
      if (!openapi) {
        logger.warn(`[${apiName}] openapi_auto.yaml の読み込みに失敗しました。`);
        continue;
      }

      logger.info(`[${apiName}] api_design.json 読み込み: ${designJsonPath}`);
      const designJson = readJsonIfExists(designJsonPath);
      if (!designJson) {
        logger.warn(`[${apiName}] api_design.json の読み込みに失敗しました。`);
        continue;
      }

      logger.info(`[${apiName}] api_errors.json 読み込み: ${apiErrorsPath}`);
      const apiErrorsJson = readJsonIfExists(apiErrorsPath) || [];

      // ErrorResponse schema を保証
      ensureErrorResponseSchema(openapi);

      const designMap = buildDesignMap(designJson);
      const apiErrorsMap = buildApiErrorsMap(apiErrorsJson);

      logger.info(`[${apiName}] パッチ適用開始`);
      const { updatedCount } = patchOpenApi(openapi, designMap, apiErrorsMap, errorMessages);

      logger.info(`[${apiName}] パッチ適用完了: updated operations = ${updatedCount}`);

      logger.info(`[${apiName}] openapi_updated.yaml 出力: ${updatedPath}`);
      writeYaml(updatedPath, openapi);

      logger.info(`[${apiName}] 完了`);
    }

    logger.info("main end");
  } catch (e) {
    logger.error(`main error: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1;
  }
};

main();
