/**
 * description を正規化する（改行・空白）
 * - 改行コードを \n に統一
 * - 各行の前後空白を trim
 * - 空行は除去
 * @param {string|null} desc
 * @returns {string|null}
 */
const normalizeDescription = (desc) => {
  logger.debug("normalizeDescription start");
  try {
    const s0 = toStrOrNull(desc);
    if (!s0) return null;

    // 改行コード統一
    let s = s0.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 各行 trim + 空行除去
    s = s
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    return s.length > 0 ? s : null;
  } finally {
    logger.debug("normalizeDescription end");
  }
};

const schema = parseTypeToSchema(row[typeIdx]);
const normalizedDesc = normalizeDescription(desc);
if (normalizedDesc) schema.description = normalizedDesc;

