const axios = require('axios');

/**
 * B64URL_RE
 * Base64URL 片（JWS の各セグメントや SD-JWT の disclosure）をざっくり検証するための正規表現。
 * - 許可文字: A–Z, a–z, 0–9, "_", "-"
 * - "=" は最大 2 文字まで許容（実際の base64url は基本パディング無しだが、緩めにチェック）
 */
const B64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

/**
 * parseCompactJwsStrict(token)
 * 3 パート JWS（JWT）を **厳格** に解析する。
 * - 期待フォーマット: "header.payload.signature"（ピリオド 2 個）
 * - header / payload は base64url(JSON) として decode / JSON.parse できること
 * - signature は base64url バイト列（JSON ではない）
 *
 * @param {string} token - 3 パート JWS（JWT）
 * @returns {{header:object, payload:object, signature:Buffer, raw:{hB64u:string,pB64u:string,sB64u:string}}}
 * @throws Error - 構造やデコードに失敗した場合
 */
function parseCompactJwsStrict(token) {
  if (typeof token !== 'string') throw new Error('token must be a string');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('not a 3-part JWS');

  const [h, p, s] = parts;
  if (![h, p, s].every(x => x && B64URL_RE.test(x))) {
    throw new Error('JWS parts are not base64url');
  }

  let header, payload, signature;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
  } catch { throw new Error('header is not valid JSON'); }

  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch { throw new Error('payload is not valid JSON'); }

  try {
    signature = Buffer.from(s, 'base64url'); // 署名は「バイト列」であり JSON ではない
  } catch { throw new Error('signature is not base64url'); }

  return { header, payload, signature, raw: { hB64u: h, pB64u: p, sB64u: s } };
}

/**
 * parseSdJwtCombinedAllowTrailingTilde(input)
 * SD-JWT の combined 文字列を解析する（末尾の "~" を **1 個だけ**許容）。
 * - 形式: <JWS>~<disclosure1>~<disclosure2>~...（末尾は "~" 無し or "~" 1 個まで許可）
 * - 先頭は必ず 3 パート JWS（発行者署名）
 * - 末尾が 3 パート JWS なら kb-jwt と見なす（任意）
 * - 中間の空セグメント（"~~"）は不許可
 *
 * @param {string} input - SD-JWT combined 文字列
 * @returns {{jws:ReturnType<typeof parseCompactJwsStrict>, disclosures:string[], kbJwt:ReturnType<typeof parseCompactJwsStrict>|null}}
 * @throws Error - 書式エラーや disclosure の decode 失敗時
 */
function parseSdJwtCombinedAllowTrailingTilde(input) {
  if (typeof input !== 'string') throw new Error('token must be a string');
  let s = input.trim();
  if (!s.includes('~')) throw new Error('not SD-JWT combined (no "~")');

  // 末尾 "~" は 1 個のみ許容（2 個以上はエラー）
  if (s.endsWith('~')) {
    s = s.slice(0, -1);
    if (s.endsWith('~')) throw new Error('only one trailing "~" allowed');
  }

  // 中間の空セグメント禁止
  if (s.includes('~~')) throw new Error('empty disclosure segment (double "~")');

  const parts = s.split('~');
  if (parts.length < 2) throw new Error('no disclosures');

  // 先頭 JWS（発行者署名）
  const jws = parseCompactJwsStrict(parts[0]);

  // 末尾が kb-jwt かどうか（3 パート JWS なら kb-jwt）
  let kbJwt = null;
  let upto = parts.length;
  try {
    const tail = parts[parts.length - 1];
    kbJwt = parseCompactJwsStrict(tail);
    upto--; // kb-jwt と認定したので disclosures 範囲から除外
  } catch {
    /* 末尾は kb-jwt ではない（= 最後まで disclosure）*/
  }

  // disclosure（base64url かつ JSON として decode 可能）を検証
  const disclosures = [];
  for (let i = 1; i < upto; i++) {
    const d = parts[i]?.trim();
    if (!d || !B64URL_RE.test(d)) throw new Error(`disclosure[${i - 1}] is not base64url`);
    try {
      const json = Buffer.from(d, 'base64url').toString('utf8');
      JSON.parse(json); // 多くは ["salt","claim","value"] 形式
    } catch {
      throw new Error(`disclosure[${i - 1}] is not valid JSON`);
    }
    disclosures.push(d);
  }

  return { jws, disclosures, kbJwt };
}

/**
 * resolveIssuerJwk({ iss, kid })
 * 署名検証用に「発行者（Issuer）の公開鍵 JWK」を取得する。
 * 対応する発行者表現:
 *  - did:jwk:...     : DID 自体に JWK が埋め込まれているので decode して返す
 *  - did:web:...     : DID ドキュメント（did.json）を HTTPS で取得し、kid に一致する verificationMethod.publicKeyJwk を返す
 *  - https(s)://...  : OIDC Issuer とみなし、.well-known/openid-configuration → jwks_uri → kid 一致の鍵を返す
 *
 * @param {{iss:string, kid?:string}} param0 - iss（必須）と任意の kid
 * @returns {Promise<object>} - 公開鍵 JWK
 * @throws Error - 未対応の iss、解決失敗、該当鍵なし など
 */
async function resolveIssuerJwk({ iss, kid }) {
  if (!iss) throw new Error('iss missing');

  // 1) did:jwk — DID 文字列から JWK を直接取り出す
  if (iss.startsWith('did:jwk:')) {
    const jwkB64u = iss.slice('did:jwk:'.length);
    return JSON.parse(Buffer.from(jwkB64u, 'base64url').toString('utf8'));
  }

  // 2) did:web — did.json を取得して verificationMethod から該当 JWK を探す
  if (iss.startsWith('did:web:')) {
    const url = didWebToDidDocUrl(iss); // 下の補助関数を参照
    const didDoc = (await axios.get(url, { timeout: 5000 })).data;
    const vms = didDoc.verificationMethod || [];
    // kid があれば id 完全一致で探す
    let vm = kid ? vms.find(x => x.id === kid) : null;
    // 見つからなければ assertionMethod の先頭を試す（フォールバック）
    if (!vm && Array.isArray(didDoc.assertionMethod) && didDoc.assertionMethod.length) {
      const firstId = typeof didDoc.assertionMethod[0] === 'string'
        ? didDoc.assertionMethod[0]
        : didDoc.assertionMethod[0].id;
      vm = vms.find(x => x.id === firstId) || vms[0];
    }
    if (!vm || !vm.publicKeyJwk) throw new Error('cannot resolve publicKeyJwk from did:web');
    return vm.publicKeyJwk;
  }

  // 3) OIDC Issuer — openid-configuration → jwks_uri → kid 一致の鍵
  if (/^https?:\/\//i.test(iss)) {
    const wellKnown = iss.replace(/\/+$/,'') + '/.well-known/openid-configuration';
    const oidc = (await axios.get(wellKnown, { timeout: 5000 })).data;
    if (!oidc.jwks_uri) throw new Error('jwks_uri not found');
    const jwks = (await axios.get(oidc.jwks_uri, { timeout: 5000 })).data;
    const key = (jwks.keys || []).find(k => !kid || k.kid === kid);
    if (!key) throw new Error('no matching JWK in JWKS');
    return key;
  }

  throw new Error(`unsupported iss: ${iss}`);
}

/** did:web → did.json の URL を組み立てる補助（端末やパスがある場合に対応） */
function didWebToDidDocUrl(didWeb) {
  const parts = didWeb.split(':'); // ["did","web",...]
  if (parts.length < 3) throw new Error('bad did:web');
  const hostAndMore = parts.slice(2); // 例: ["10.0.2.15%3A6102","dids","issuer01"]
  const host = decodeURIComponent(hostAndMore[0]); // ポートは %3A を decode
  const path = hostAndMore.slice(1).join('/');
  return path
    ? `https://${host}/${path}/did.json`
    : `https://${host}/.well-known/did.json`;
}

module.exports = {
  B64URL_RE,
  parseCompactJwsStrict,
  parseSdJwtCombinedAllowTrailingTilde,
  resolveIssuerJwk,
};
