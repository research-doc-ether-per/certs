
const fs = require("fs");
const path = require("path");
const log4js = require("log4js");
const configData = require("../config/config.json");

const log4jsConfig = require("../../config/log4js.json");

// ログ設定
const fileName = "extract-api-errors-from-csv";
log4jsConfig.appenders.file.filename = `../logs/${fileName}.log`;
log4js.configure(log4jsConfig);
const logger = log4js.getLogger(fileName);

/**
 * trim して空なら null
 * @param {any} v
 * @returns {string|null}
 */
const toStrOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

/**
 * 簡易 CSV parser（ダブルクォート対応）
 * @param {string} csvText
 * @returns {string[][]}
 */
const parseCsv = (csvText) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

    if (ch !== "\r") cell += ch;
  }

  pushCell();
  pushRow();

  // 末尾の完全空行を削除
  while (rows.length && rows[rows.length - 1].every((c) => !toStrOrNull(c))) {
    rows.pop();
  }

  return rows;
};

/**
 * row に "errors" が含まれる列 index を探す
 * @param {string[]} row
 * @returns {number}
 */
const findErrorsIndex = (row) => {
  for (let i = 0; i < row.length; i++) {
    const v = (toStrOrNull(row[i]) || "").toLowerCase();
    if (v === "errors") return i;
  }
  return -1;
};

/**
 * CSV から API error 定義を抽出
 * @param {string} csvText
 * @returns {Array<{description:string, api:string, method:string, errors:string[]}>}
 */
const extractApiErrors = (csvText) => {
  const rows = parseCsv(csvText);

  const result = [];
  let current = null;
  let inErrors = false;
  let errorCol = -1;

  const isApiRow = (row) => {
    return !!(toStrOrNull(row[1]) && toStrOrNull(row[2]));
  };

  for (const row of rows) {
    // API 定義行
    if (isApiRow(row)) {
      current = {
        description: toStrOrNull(row[0]) || "",
        api: toStrOrNull(row[1]) || "",
        method: (toStrOrNull(row[2]) || "").toUpperCase(),
        errors: new Set(),
      };
      result.push(current);

      inErrors = false;
      errorCol = -1;
      continue;
    }

    if (!current) continue;

    // errors 行
    const eIdx = findErrorsIndex(row);
    if (eIdx >= 0) {
      inErrors = true;

      // errors の右隣を基本とする
      errorCol = eIdx + 1;

      // 同行に値がある場合はそれを採用
      for (let i = eIdx + 1; i < row.length; i++) {
        if (toStrOrNull(row[i])) {
          errorCol = i;
          break;
        }
      }

      const sameLineError = toStrOrNull(row[errorCol]);
      if (sameLineError) current.errors.add(sameLineError);
      continue;
    }

    // errors ブロック中
    if (inErrors && errorCol >= 0) {
      const err = toStrOrNull(row[errorCol]);

      if (!err) {
        // 完全空行 → errors ブロック終了
        if (row.every((c) => !toStrOrNull(c))) {
          inErrors = false;
          errorCol = -1;
        }
        continue;
      }

      current.errors.add(err);
    }
  }

  return result.map((e) => ({
    description: e.description,
    api: e.api,
    method: e.method,
    errors: Array.from(e.errors),
  }));
};

/**
 * main
 */
const main = () => {
  logger.info("start extract-api-errors-from-csv");

  const configs = Array.isArray(configData) ? configData : [configData];

  for (const cfg of configs) {
    const apiName = cfg.apiName || "api";
    const csvPath = cfg.apiDetailsPath;

    if (!csvPath) {
      logger.warn(`[${apiName}] apiDetailsPath is not defined, skip`);
      continue;
    }

    const absPath = path.resolve(csvPath);
    if (!fs.existsSync(absPath)) {
      logger.error(`[${apiName}] CSV not found: ${absPath}`);
      continue;
    }

    logger.info(`[${apiName}] read csv: ${absPath}`);
    const csvText = fs.readFileSync(absPath, "utf-8");

    const errors = extractApiErrors(csvText);

    const outputDir = path.resolve(__dirname, "..", "output", apiName);
    fs.mkdirSync(outputDir, { recursive: true });

    const outFile = path.join(outputDir, "api_errors.json");
    fs.writeFileSync(outFile, JSON.stringify(errors, null, 2) + "\n", "utf-8");

    logger.info(`[${apiName}] api_errors.json generated: ${outFile}`);
  }

  logger.info("end extract-api-errors-from-csv");
};

main();
