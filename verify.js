/**
 * パスをセグメント配列に変換する
 *
 */
const splitPath = (p) =>
  (p || "")
    .split("?")[0]
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

/**
 * テンプレートパスと実リクエストパスが一致するか判定する
 *
 */
const matchTemplatePath = (templateSegs, requestSegs) => {
  if (templateSegs.length !== requestSegs.length) return false;

  for (let i = 0; i < templateSegs.length; i += 1) {
    const tpl = templateSegs[i];
    const req = requestSegs[i];

    if (!req) return false;

    // 動的パラメータ（:userId など）は常に一致
    if (tpl.startsWith(":")) continue;

    // 静的セグメントは完全一致必須
    if (tpl !== req) return false;
  }

  return true;
};

/**
 * api-meta.json を内部ルールに変換する
 *
 * - 毎リクエストで split しないよう事前に分解
 * - 静的セグメント数が多いものを優先（より具体的な API）
 */
const apiMetaRules = Object.entries(apiMetaMap)
  .map(([key, meta]) => {
    const [method, ...pathParts] = key.split(" ");
    const templatePath = pathParts.join(" ").trim();
    const templateSegs = splitPath(templatePath);

    return {
      method: (method || "").toUpperCase(),
      templatePath,
      templateSegs,
      staticCount: templateSegs.filter((s) => !s.startsWith(":")).length,
      meta,
    };
  })
  // より具体的なルールを優先
  .sort((a, b) => b.staticCount - a.staticCount);

/**
 * リクエストから APIメタ情報を解決する
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

  // 未一致（設定漏れ・404 等）
  return { apiId: null, apiName: null };
};
