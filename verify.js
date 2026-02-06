/**
 * 特別処理が必要な API かどうかを判定する
 *
 * @param {import("express").Request} req
 * @returns {string|null}
 *   特別API種別（識別子）
 */
const detectSpecialApi = (req) => {
  const method = req.method.toUpperCase();
  const path = req.path;

  if (
    method === "POST" &&
    /^\/vc\/wallets\/[^/]+\/sp\/b4dvc$/.test(path)
  ) {
    return "B4D_ISSUE";
  }

  if (
    method === "GET" &&
    /^\/vc\/[^/]+\/verify$/.test(path)
  ) {
    return "VC_VERIFY";
  }

  if (
    method === "POST" &&
    path === "/vc/verify"
  ) {
    return "VC_VERIFY";
  }

  return null;
};

/**
 * request body のマスキング（ログ・監視用）
 */
const sanitizeRequestBodyForLog = (specialType, body) => {
  if (!body || typeof body !== "object") return body;

  if (specialType === "B4D_ISSUE") {
    if ("image" in body) {
      return {
        ...body,
        image: "",
      };
    }
  }

  return body;
};


/**
 * response data のマスキング（ログ・監視用）
 */
const sanitizeResponseDataForLog = (specialType, data) => {
  if (!data || typeof data !== "object") return data;

  if (specialType === "VC_VERIFY") {
    const vct = data?.certData?.vct;
    if (isBase4InfoVct(vct)) {
      return {
        ...data,
        disclosedClaims: maskDisclosedClaims(data.disclosedClaims),
      };
    }
  }

  return data;
};


const isBase4InfoVct = (vct) =>
  typeof vct === "string" && vct.endsWith("/base_4_info");


/**
 * disclosedClaims の value をすべて空文字に置換
 */
const maskDisclosedClaims = (claims) => {
  if (!claims || typeof claims !== "object") return claims;

  const masked = {};
  for (const key of Object.keys(claims)) {
    masked[key] = "";
  }
  return masked;
};
