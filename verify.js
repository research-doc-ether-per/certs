import { createHash }            from 'crypto';
import base64url                 from 'base64url';
import { SignJWT, importPKCS8 }  from 'jose';
import { parse }                 from '@sd-jwt/core';   // issuerJwt 解析用

/**
 * Helper: 计算 SHA-256 → Base64URL
 */
function sha256b64url(data) {
  return base64url(createHash('sha256').update(data).digest());
}

/**
 * Holder の公鍵 (JWK) を作る
 * （openssl などで PEM -> JWK が必要なら別途変換関数を用意）
 */
async function getPublicJwk(pkcs8Pem) {
  const privateKey = await importPKCS8(pkcs8Pem, 'ES256');
  const { x, y, crv, kty } = await crypto.subtle.exportKey('jwk', privateKey);
  return { kty, crv, x, y };
}

/**
 * Walt.id 発行の <issuerJwt>~<disc…> を
 * <issuerJwt>~<selDisc…>~<kbJwt> に変換
 */
export async function buildPresentedSdJwt(
  issued, selected, aud, nonce, pkcs8Pem, kid
) {
  /* ① issuerJwt / disclosure 部分を決定 --------------------------------- */
  const { parts: [issuerJwt], disclosures: allDiscs } = parse(issued);
  // issuerJwt: JWS / allDiscs: 全 disclosure 配列

  const openDiscs = selected.length ? selected : allDiscs;      // 全開示なら allDiscs
  const sdJwtCompact = [issuerJwt, ...openDiscs].join('~');     // <iss>~<selDisc…>

  /* ② sd_hash を計算 ---------------------------------------------------- */
  const sdHash = sha256b64url(sdJwtCompact);

  /* ③ KB-JWT payload を組み立て ---------------------------------------- */
  const holderJwk = await getPublicJwk(pkcs8Pem);
  const kbPayload = {
    sd_hash: sdHash,
    aud,
    nonce,
    iat: Math.floor(Date.now() / 1000),
    sub_jwk: holderJwk,   // もしくは { cnf:{ jwk: holderJwk } }
  };

  /* ④ 署名 ------------------------------------------------------------- */
  const privateKey = await importPKCS8(pkcs8Pem, 'ES256');
  const kbJwt = await new SignJWT(kbPayload)
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid })
    .sign(privateKey);

  /* ⑤ 3ピース連結して返却 ---------------------------------------------- */
  return `${sdJwtCompact}~${kbJwt}`;          // <iss>~<selDisc…>~<kbJwt>
}
