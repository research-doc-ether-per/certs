import zlib from 'zlib';

/** multibase（'u' = base64url no pad）プレフィックスを除去 */
function stripMultibasePrefix(s) {
  // 'u' は base64url（no padding）の multibase プレフィックス
  return s?.startsWith('u') ? s.slice(1) : s;
}

/** Base64URL 文字列 → Buffer（padding なし対応） */
function b64urlToBuf(s) {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  // padding は Buffer.from(base64) は不要でも動くが、長さが 4 の倍数でなくても受ける
  return Buffer.from(t, 'base64');
}

/** encodedList をデコード：multibase 'u' → base64url → gunzip */
function decodeEncodedList(encodedList) {
  // 1) multibase 'u' を取り除く
  const noPrefix = stripMultibasePrefix(encodedList);
  if (!noPrefix) throw new Error('encodedList is empty.');

  // 2) base64url デコード
  const gz = b64urlToBuf(noPrefix);

  // 3) gzip 展開（この実装では必ず gzip 前提）
  try {
    return zlib.gunzipSync(gz);
  } catch (e) {
    throw new Error('encodedList must be gzip-compressed base64url (multibase "u").');
  }
}

/**
 * BitstringStatusList（revocation）の失効判定
 *  - 発行側の形式：multibase 'u' + base64url(gzip(bytes)) に合わせる
 *  - 範囲外 index はエラー
 *
 * @param {object} vc   VC JSON（credentialSubject.encodedList / statusPurpose）
 * @param {string|number} index  0 始まりの index（文字列でも可）
 * @returns {boolean} true=失効（revoked） / false=未失効（active）
 */
export function isRevoked(vc, index) {
  // 必須フィールド確認
  const cs = vc?.credentialSubject;
  if (!cs?.encodedList) throw new Error('encodedList is missing.');
  if (cs.statusPurpose !== 'revocation') {
    throw new Error('statusPurpose must be "revocation".');
  }

  // index を数値化して検証
  const idx = Number(index);
  if (!Number.isFinite(idx) || idx < 0) {
    throw new Error('index must be a non-negative number.');
  }

  // デコード（multibase 'u' → base64url → gunzip）
  const raw = decodeEncodedList(cs.encodedList);

  // 利用可能ビット長チェック（範囲外はエラー）
  const bitLen = raw.length * 8; // 例：16384 bytes → 131072 bits
  if (idx >= bitLen) {
    throw new Error(`statusListIndex out of range (max=${bitLen - 1}, got=${idx}, bytes=${raw.length}).`);
  }

  // バイト配列からビット判定（MSB-first）
  const byteIdx = Math.floor(idx / 8);
  const bitIdx  = idx % 8;
  const b = raw[byteIdx];
  return (b & (1 << (7 - bitIdx))) !== 0; // 1 = revoked
}

/** 有効性（true=有効 / false=無効） */
export function isVcValid(vc, index) {
  return !isRevoked(vc, index);
}
