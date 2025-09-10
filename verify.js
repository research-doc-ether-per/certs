// Node >=16（内置支持 'base64url'）。只做“结构解析”，不做验签。

const B64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

/** 解析 3パートJWS（JWT）。OK⇒{ header, payload, signature(Buffer) }／NG⇒throw */
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
    header  = JSON.parse(Buffer.from(h.replace(/=/g,''), 'base64url').toString('utf8'));
  } catch { throw new Error('header is not valid JSON'); }
  try {
    payload = JSON.parse(Buffer.from(p.replace(/=/g,''), 'base64url').toString('utf8'));
  } catch { throw new Error('payload is not valid JSON'); }
  try {
    signature = Buffer.from(s.replace(/=/g,''), 'base64url'); // 署名はバイト列
  } catch { throw new Error('signature is not base64url'); }
  return { header, payload, signature };
}

/** 解析 SD-JWT combined：<JWS>~<disc>~...(~<kb-jwt>任意)。OK⇒对象／NG⇒throw */
function parseSdJwtCombinedStrict(input) {
  if (typeof input !== 'string') throw new Error('token must be a string');
  const parts = input.split('~');
  if (parts.length < 2) throw new Error('not SD-JWT combined (no "~")');

  // 先頭は必ず JWS
  const jws = parseCompactJwsStrict(parts[0]);

  // 末尾が kb-jwt かを判定（JWS として通れば kb-jwt とみなす）
  let kbJwt = null;
  let upto = parts.length;
  try {
    kbJwt = parseCompactJwsStrict(parts[parts.length - 1]);
    upto--; // 最後の一つを kb-jwt として扱う
  } catch { /* 末尾は kb-jwt ではない → 無視 */ }

  // 各 disclosure は base64url(JSON想定) を厳格チェック
  const disclosures = [];
  for (let i = 1; i < upto; i++) {
    const d = parts[i]?.trim();
    if (!d || !B64URL_RE.test(d)) {
      throw new Error(`disclosure[${i-1}] is not base64url`);
    }
    try {
      const json = Buffer.from(d.replace(/=/g,''), 'base64url').toString('utf8');
      JSON.parse(json); // 多くは ["salt","claim","value"] 形式
    } catch {
      throw new Error(`disclosure[${i-1}] is not valid JSON`);
    }
    disclosures.push(d);
  }
  return { jws, disclosures, kbJwt };
}

/** 入口函数：自动判断是纯 JWS 还是 SD-JWT combined；OK 返回结构，NG 直接 throw */
function parseTokenStrict(input) {
  const s = (input ?? '').toString().trim();
  if (!s) throw new Error('empty token');
  if (s.includes('~')) {
    const r = parseSdJwtCombinedStrict(s);
    return { type: 'sd-jwt-combined', ...r };
  }
  const r = parseCompactJwsStrict(s);
  return { type: 'jws', ...r };
}

module.exports = {
  parseCompactJwsStrict,
  parseSdJwtCombinedStrict,
  parseTokenStrict,
};
