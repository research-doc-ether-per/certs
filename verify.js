import zlib from 'zlib';

/**
 * Base64URL 形式の文字列を Buffer に変換する
 * @param {string} s Base64URL 文字列
 * @returns {Buffer}
 */
function b64urlToBuf(s) {
  const pad = '==='.slice((s.length + 3) % 4);
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

/**
 * BitstringStatusList（revocation）のエンコードデータを解析し、
 * 指定された index の状態を確認する
 *
 * @param {object} vc - VC（credentialSubject に encodedList を含む JSON）
 * @param {number} index - credentialStatus の index（0 始まり）
 * @returns {boolean} true: 該当 VC は「失効（revoked）」状態
 *                    false: 有効（active）
 */
export function isRevoked(vc, index) {
  const cs = vc?.credentialSubject;

  // 必須チェック
  if (!cs?.encodedList) throw new Error('encodedList is missing.');
  if (cs.statusPurpose !== 'revocation')
    throw new Error('statusPurpose must be "revocation".');
  if (!Number.isInteger(index) || index < 0)
    throw new Error('index must be a non-negative integer.');

  // --- ① Base64URLデコード → GZIP解凍 ---
  const raw = zlib.gunzipSync(b64urlToBuf(cs.encodedList));

  // --- ② デコード結果が文字列(010101...)かバイナリかを判定 ---
  const asText = raw.toString('utf8');

  if (/^[01]+$/.test(asText)) {
    // 解凍結果がビット列（例："0010101..."）の場合
    const ch = asText[index];
    if (ch == null) throw new Error('index out of range.');
    return ch === '1'; // 1 → 失効済み
  } else {
    // バイト配列の場合：各ビットを上位ビット(MSB)から確認
    const byteIdx = Math.floor(index / 8);
    const bitIdx = index % 8;
    const b = raw[byteIdx];
    if (b === undefined) throw new Error('index out of range.');
    return (b & (1 << (7 - bitIdx))) !== 0; // 1 → 失効済み
  }
}

