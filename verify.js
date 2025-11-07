import zlib from 'zlib';

/** Base64URL 文字列を Buffer に変換（パディング自動補完） */
function b64urlToBuf(s) {
  // URL 形式を標準 Base64 に正規化
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  // 必要に応じてパディングを補う
  const padLen = (4 - (t.length % 4)) % 4;
  if (padLen) t += '='.repeat(padLen);
  return Buffer.from(t, 'base64');
}

/** encodedList を解凍して生データ(Buffer)を返す（gzip/deflate/非圧縮に対応） */
function decodeEncodedList(encodedList) {
  const buf = b64urlToBuf(encodedList);

  // 1) GZIP マジック(0x1f,0x8b) の判定
  const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  if (isGzip) {
    return zlib.gunzipSync(buf); // 典型ケース（"H4sI..." で始まる）
  }

  // 2) GZIP でなければ、raw DEFLATE を試す
  try {
    return zlib.inflateRawSync(buf);
  } catch {
    // 3) それでもダメなら、既に非圧縮（= 生文字列/ビットマップ）とみなす
    return buf;
  }
}

/**
 * BitstringStatusList（revocation）における失効ビットを確認
 * @param {object} vc      VC JSON（credentialSubject.encodedList / statusPurpose）
 * @param {string|number} index  0始まりの index（文字列でも可）
 * @returns {boolean} true=失効（無効） / false=未失効（有効）
 */
export function isRevoked(vc, index) {
  const cs = vc?.credentialSubject;
  if (!cs?.encodedList) throw new Error('encodedList is missing.');
  if (cs.statusPurpose !== 'revocation')
    throw new Error('statusPurpose must be "revocation".');

  const idx = Number(index);
  if (!Number.isFinite(idx) || idx < 0)
    throw new Error('index must be a non-negative number.');

  // --- 解凍（gzip/deflate/非圧縮 自動判定）---
  const raw = decodeEncodedList(cs.encodedList);

  // --- ビット判定：文字列 "0101..." か、バイト配列かを分岐 ---
  const asText = raw.toString('utf8');
  if (/^[01]+$/.test(asText)) {
    const ch = asText[idx];
    if (ch == null) throw new Error('index out of range.');
    return ch === '1'; // 1 = revoked
  }

  // バイト配列の場合（MSB-first）
  const byteIdx = Math.floor(idx / 8);
  const bitIdx = idx % 8;
  const b = raw[byteIdx];
  if (b === undefined) throw new Error('index out of range.');
  return (b & (1 << (7 - bitIdx))) !== 0; // 1 = revoked
}

/** 有効性（true=有効 / false=無効） */
export function isVcValid(vc, index) {
  return !isRevoked(vc, index);
}
