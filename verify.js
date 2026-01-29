
/**
 * OpenAPI の operation オブジェクトのキー順を正規化する
 * 順序:
 * 1. description
 * 2. summary
 * 3. security
 * 4. parameters
 * 5. requestBody
 * 6. responses
 * ※上記以外は末尾に（元の順序を維持）
 */
const normalizeOperationKeyOrder = (op) => {
  if (!op || typeof op !== "object") return op;

  const preferredOrder = [
    "description",
    "summary",
    "security",
    "parameters",
    "requestBody",
    "responses",
  ];

  // 優先キーを指定順で詰める
  const next = {};
  for (const k of preferredOrder) {
    if (Object.prototype.hasOwnProperty.call(op, k)) {
      next[k] = op[k];
    }
  }

  // 残りキーは元の順序を維持
  for (const k of Object.keys(op)) {
    if (preferredOrder.includes(k)) continue;
    next[k] = op[k];
  }

  return next;
};

/**
 * paths 配下の各 operation を normalizeOperationKeyOrder で並べ替える
 * @param {object} openapi
 * @returns {object} openapi
 */
const normalizePathsOperationsOrder = (openapi) => {
  if (!openapi || typeof openapi !== "object") return openapi;
  if (!openapi.paths || typeof openapi.paths !== "object") return openapi;

  const methods = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

  for (const p of Object.keys(openapi.paths)) {
    const pathItem = openapi.paths[p];
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const m of methods) {
      if (!pathItem[m]) continue;
      pathItem[m] = normalizeOperationKeyOrder(pathItem[m]);
    }
  }

  return openapi;
};
