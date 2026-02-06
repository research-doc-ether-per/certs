
const createApiMetaResolver = () => {


  /**
   * matcher 一覧
   */
  const entries = Object.entries(apiMetaMap).map(([key, meta]) => {
    const [method, ...pathParts] = key.split(" ");
    const pattern = pathParts.join(" ").trim();

    return {
      method: (method || "").toUpperCase(),
      pattern,
      matcher: match(pattern, { decode: decodeURIComponent, end: true }),
      meta,
    };
  });

// リクエストに対応する APIメタ情報を取得する
  const resolve = (req) => {
    const method = (req.method || "").toUpperCase();

    const reqPath = req.path;

    for (const e of entries) {
      if (e.method !== method) continue;

      const m = e.matcher(reqPath);
      if (m) return e.meta;
    }

    return null;
  };

  return { resolve };
};
