import zlib from 'zlib';

/** Base64URL 文字列を Buffer に変換（パディング自動補完） */
function b64urlToBuf(s) {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(t, 'base64');
}

/** encodedList をデコード（gzip + base64url） */
function decodeEncodedList(encodedList) {
  if (!encodedList) throw new Error('encodedList is empty.');

  // 先頭の 'u' を除去
  const base64url = encodedList.startsWith('u') ? encodedList.slice(1) : encodedList;

  // base64url → Buffer
  const gz = b64urlToBuf(base64url);

  // gzip 展開
  try {
    return zlib.gunzipSync(gz);
  } catch {
    throw new Error('encodedList must be gzip-compressed base64url.');
  }
}

/**
 * 失効状態を確認する関数（revocation 用）
 * 
 * @param {object} vc   VC JSON（credentialSubject.encodedList / statusPurpose）
 * @param {string|number} index  0 始まりの index（文字列でも可）
 * @returns {boolean} true=失効（revoked） / false=未失効（active）
 */
export function isRevoked(vc, index) {
  const cs = vc?.credentialSubject;
  if (!cs?.encodedList) throw new Error('encodedList is missing.');
  if (cs.statusPurpose !== 'revocation') {
    throw new Error('statusPurpose must be "revocation".');
  }

  // index を数値化
  const idx = Number(index);
  if (!Number.isFinite(idx) || idx < 0) {
    throw new Error('index must be a non-negative number.');
  }

  // encodedList のデコード
  const raw = decodeEncodedList(cs.encodedList);

  // 利用可能ビット長の範囲チェック
  const bitLen = raw.length * 8;
  if (idx >= bitLen) {
    throw new Error(`statusListIndex out of range (max=${bitLen - 1}, got=${idx}, bytes=${raw.length}).`);
  }

  // ビット単位で失効判定（MSB-first）
  const byteIdx = Math.floor(idx / 8);
  const bitIdx = idx % 8;
  const b = raw[byteIdx];
  return (b & (1 << (7 - bitIdx))) !== 0; // 1 = revoked
}

/** 有効性を確認する関数（true=有効 / false=無効） */
export function isVcValid(vc, index) {
  return !isRevoked(vc, index);
}
