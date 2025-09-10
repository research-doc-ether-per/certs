// 检测：紧凑 JWS（JWT）是否结构正确，并报告 header/payload 可解析、signature 可解码
const b64uRe = /^[A-Za-z0-9_-]+={0,2}$/;

function checkCompactJws(t) {
  const parts = String(t || '').split('.');
  if (parts.length !== 3 || parts.some(p => !p || !b64uRe.test(p))) {
    return { ok: false, reason: 'bad parts or base64url' };
  }
  try {
    const header = JSON.parse(Buffer.from(parts[0].replace(/=/g,''), 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1].replace(/=/g,''), 'base64url').toString('utf8'));
    // 签名段：只需能 base64url 解码为 Buffer（不是 JSON）
    Buffer.from(parts[2].replace(/=/g,''), 'base64url');
    return { ok: true, header, payload, signatureDecodable: true };
  } catch (e) {
    return { ok: false, reason: 'header/payload not JSON or signature not base64url', error: String(e) };
  }
}

// 识别格式：纯 JWS 或 SD-JWT combined，并返回签名可解码性
function detectTokenFormat(input) {
  const s = (input ?? '').toString().trim();
  if (!s) return { valid: false, reason: 'empty' };

  const dots = (s.match(/\./g) || []).length;
  const tildes = (s.match(/~/g) || []).length;

  // 纯 JWS（JWT）
  if (tildes === 0 && dots === 2) {
    const r = checkCompactJws(s);
    return r.ok ? { valid: true, type: 'jws', jws: r } : { valid: false, type: 'jws', reason: r.reason };
  }

  // SD-JWT combined：<JWS>~<disc>~...(~<kb-jwt> 可选)
  if (tildes >= 1) {
    const parts = s.split('~');
    const jwsCheck = checkCompactJws(parts[0]);
    if (!jwsCheck.ok) return { valid: false, type: 'sd-jwt-combined', reason: 'first part not JWS' };

    // 最后一段可能是 kb-jwt
    let hasKbJwt = false, kb = null, upto = parts.length;
    if (checkCompactJws(parts[parts.length - 1]).ok) {
      hasKbJwt = true;
      kb = checkCompactJws(parts[parts.length - 1]);
      upto--;
    }

    // 校验每个 disclosure 是 base64url（可选：尝试 JSON.parse）
    const disclosures = [];
    for (let i = 1; i < upto; i++) {
      const d = parts[i].trim();
      if (!d || !b64uRe.test(d)) return { valid: false, type: 'sd-jwt-combined', reason: `disclosure[${i-1}] not base64url` };
      try { JSON.parse(Buffer.from(d.replace(/=/g,''), 'base64url').toString('utf8')); } catch {}
      disclosures.push(d);
    }

    return {
      valid: true,
      type: 'sd-jwt-combined',
      jws: jwsCheck,                    // 含 signatureDecodable
      disclosuresCount: disclosures.length,
      hasKbJwt,
      kbJwt: kb                         // 若存在，也含 signatureDecodable
    };
  }

  return { valid: false, reason: 'neither compact JWS nor SD-JWT combined' };
}

module.exports = { detectTokenFormat, checkCompactJws };

