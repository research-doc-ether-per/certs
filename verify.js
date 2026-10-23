const isHttps =
  issuerUrl.protocol === "https:" &&
  jwksUrl.protocol === "https:";

const isLocalHttp =
  issuerUrl.protocol === "http:" &&
  jwksUrl.protocol === "http:" &&
  issuerUrl.hostname === "10.0.2.15" &&
  jwksUrl.hostname === "10.0.2.15" &&
  issuerUrl.port === "8580" &&
  jwksUrl.port === "8580";

if (!isHttps && !isLocalHttp) {
  throw new Error("OIDC endpoints must use HTTPS");
}


// JWT ヘッダーと JWKS の確認
const checkOidcSigningKey = async (idToken) => {
  console.debug("*** checkOidcSigningKey start ***");

  try {
    const header = decodeProtectedHeader(idToken);
    const claims = decodeJwt(idToken);

    const response = await fetch(OIDC_JWKS_URI);
    if (!response.ok) {
      throw new Error(`JWKS request failed: ${response.status}`);
    }

    const jwks = await response.json();

    const keys = (jwks.keys || []).map((key) => ({
      kid: key.kid,
      alg: key.alg,
      kty: key.kty,
      use: key.use,
      key_ops: key.key_ops,
    }));

    console.debug("Token header:", {
      kid: header.kid,
      alg: header.alg,
      typ: header.typ,
    });

    console.debug("Token claims:", {
      iss: claims.iss,
      aud: claims.aud,
      azp: claims.azp,
    });

    console.debug("JWKS keys:", keys);

    const matchingKeys = keys.filter(
      (key) => key.kid === header.kid
    );

    const result = {
      matchingKeyCount: matchingKeys.length,
    };

    console.debug("result : ", result);

    return result;
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("*** checkOidcSigningKey end ***");
  }
};
