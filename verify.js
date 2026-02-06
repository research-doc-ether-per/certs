/**
 * Express の request 情報から「ルート定義のテンプレートパス」を生成する
 *
 */
const buildRouteTemplatePath = (req) => {
  const routePath = req.route?.path;

  const baseUrl = req.baseUrl || "";

  if (!routePath) return null;

  return `${baseUrl}${routePath}`.replace(/\/+/g, "/");
};

/**
 * API メタ情報（apiId / apiName）を取得する
 *
 */
const getApiMeta = (req) => {
  const method = (req.method || "").toUpperCase();

  const tpl = buildRouteTemplatePath(req);

  if (tpl) {
    const key = `${method} ${tpl}`;
    return apiMetaMap[key] || null;
  }

  const urlPath = (req.originalUrl || "").split("?")[0];
  const key = `${method} ${urlPath}`;
  return apiMetaMap[key] || null;
};

