const toStrOrNull = (v) => {
  logger.debug("toStrOrNull start");
  try {
    if (v === undefined || v === null) return null;

    const s = String(v)
      .replace(/\r\n/g, "\n") 
      .replace(/\r/g, "\n")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(" - ")
      .trim();

    return s.length === 0 ? null : s;
  } finally {
    logger.debug("toStrOrNull end");
  }
};
