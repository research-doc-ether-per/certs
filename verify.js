/**
 * パスをセグメント配列に分割する
 */
const splitPath = (p) =>
  (p || "")
    .split("?")[0]
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

/**
 * テンプレート（:param）と実パスが一致するか判定する
 */
const matchTemplatePath = (templateSegs, requestSegs) => {
  if (templateSegs.length !== requestSegs.length) return false;

  for (let i = 0; i < templateSegs.length; i += 1) {
    const tpl = templateSegs[i];
    const req = requestSegs[i];

    if (!req) return false;

    if (tpl.startsWith(":")) continue; 
    if (tpl !== req) return false;     
  }

  return true;
};

const parseKey = (key) => {
  const idx = key.indexOf("_");
  if (idx <= 0) {
    return { method: null, templatePath: null };
  }

  const method = key.slice(0, idx).toUpperCase();
  const templatePath = key.slice(idx + 1);

  return { method, templatePath };
};

/**
 * api-meta.json を内部ルールに変換し、より具体的なものを優先する
 */
const apiMetaRules = Object.entries(apiMetaMap)
  .map(([key, meta]) => {
    const { method, templatePath } = parseKey(key);

    const templateSegs = splitPath(templatePath);
    const staticCount = templateSegs.filter((s) => !s.startsWith(":")).length;

    return {
      key,
      method,
      templatePath,
      templateSegs,
      staticCount,
      meta,
    };
  })
  .filter((r) => r.method && r.templatePath)
  .sort((a, b) => b.staticCount - a.staticCount);

/**
 * リクエストから APIメタ情報（apiId/apiName）を解決する
 */
const resolveApiMeta = (req) => {
  const method = (req.method || "").toUpperCase();
  
  const requestSegs = splitPath(req.path);

  for (const rule of apiMetaRules) {
    if (rule.method !== method) continue;

    if (matchTemplatePath(rule.templateSegs, requestSegs)) {
      return rule.meta;
    }
  }

  // 未一致（設定漏れ/404 等）
  return { apiId: null, apiName: null };
};
