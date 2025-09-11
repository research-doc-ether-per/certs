// 允许 “…~” 结尾（最多 1 个），且只做“格式/结构”解析，不做验签
const B64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

/** JWS（3パート）の厳格パース：OK→{header,payload,signature(Buffer)}／NG→throw */
function parseCompactJwsStrict(token) {
  if (typeof token !== 'string') throw new Error('token must be a string');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('not a 3-part JWS');
  const [h, p, s] = parts;
  if (![h, p, s].every(x => x && B64URL_RE.test(x))) {
    throw new Error('JWS parts are not base64url');
  }
  let header, payload, signature;
  try { header  = JSON.parse(Buffer.from(h.replace(/=/g,''), 'base64url').toString('utf8')); }
  catch { throw new Error('header is not valid JSON'); }
  try { payload = JSON.parse(Buffer.from(p.replace(/=/g,''), 'base64url').toString('utf8')); }
  catch { throw new Error('payload is not valid JSON'); }
  try { signature = Buffer.from(s.replace(/=/g,''), 'base64url'); }
  catch { throw new Error('signature is not base64url'); }
  return { header, payload, signature };
}

/** SD-JWT combined：末尾に「~」が 0 or 1 個だけ許容。OK→{jws,disclosures,kbJwt|null}／NG→throw */
function parseSdJwtCombinedAllowTrailingTilde(input) {
  if (typeof input !== 'string') throw new Error('token must be a string');
  let s = input.trim();
  if (!s.includes('~')) throw new Error('not SD-JWT combined (no "~")');

  // 末尾 ~ の扱い（0 or 1 個のみ許可）
  if (s.endsWith('~')) {
    s = s.slice(0, -1);         // ちょうど 1 個は許容して削除
    if (s.endsWith('~')) throw new Error('only one trailing "~" allowed');
  }

  // 中間の空セグメント禁止（"~~" が残っていないこと）
  if (s.includes('~~')) throw new Error('empty disclosure segment (double "~")');

  const parts = s.split('~');
  if (parts.length < 2) throw new Error('no disclosures'); // jws のみは不可（combined想定なので）

  // 先頭 JWS（発行者署名）
  const jws = parseCompactJwsStrict(parts[0]);

  // 末尾が kb-jwt か判定（3パートJWSなら kb-jwt とみなす）
  let kbJwt = null;
  let upto = parts.length;
  try {
    const tailCheck = parseCompactJwsStrict(parts[parts.length - 1]);
    kbJwt = tailCheck;
    upto--; // 最後の 1 個を kb-jwt と見做した
  } catch {
    /* 末尾は disclosure のまま */
  }

  // disclosure は base64url(JSON) を厳格チェック
  const disclosures = [];
  for (let i = 1; i < upto; i++) {
    const d = parts[i]?.trim();
    if (!d || !B64URL_RE.test(d)) {
      throw new Error(`disclosure[${i - 1}] is not base64url`);
    }
    try {
      const json = Buffer.from(d.replace(/=/g,''), 'base64url').toString('utf8');
      JSON.parse(json); // 多くは ["salt","claim","value"]
    } catch {
      throw new Error(`disclosure[${i - 1}] is not valid JSON`);
    }
    disclosures.push(d);
  }

  return { jws, disclosures, kbJwt };
}

/** 入口：JWS or SD-JWT(combined, 末尾~可) を自動判別して解析 */
function parseTokenStrictAllowTrailingTilde(input) {
  const s = (input ?? '').toString().trim();
  if (!s) throw new Error('empty token');
  if (s.includes('~')) {
    return { type: 'sd-jwt-combined', ...parseSdJwtCombinedAllowTrailingTilde(s) };
  }
  return { type: 'jws', ...parseCompactJwsStrict(s) };
}

module.exports = {
  parseCompactJwsStrict,
  parseSdJwtCombinedAllowTrailingTilde,
  parseTokenStrictAllowTrailingTilde,
};

