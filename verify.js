const part = s.split('/vcUrls/')[1]?.split(/\/+credential\b/)[0] || '';

// 只解一层：把 %25XX 还原为 %XX（不会把 %3A 变成 ":"）
const fixed = part.replace(/%25([0-9A-Fa-f]{2})/g, '%$1');

const m = url.match(/\/([^/]+)\/revocation\/\d+(?:\/|$)/);
const val = m ? m[1] : null;
