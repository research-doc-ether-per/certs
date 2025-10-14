// utils/bitstring.js
// -------------------------------------------------------------
// Bitstring Status List 用ユーティリティ（最小変更版）
// - ビットセット生成・更新（MSB-first）
// - GZIP → base64url（末尾 = なし）→ 先頭に 'u'（Multibase）
// - 公開前セルフチェック（任意）
// -------------------------------------------------------------

import zlib from 'zlib';

/**
 * 指定ビット数の 0 初期化ビットセットを作成
 * @param {number} sizeBits - 管理したい VC 件数（= ビット数）
 * @returns {Buffer} 例: sizeBits=65536 → 8192 bytes
 */
export function createZeroBitset(sizeBits) {
  const sizeBytes = Math.ceil(sizeBits / 8);
  return Buffer.alloc(sizeBytes, 0);
}

/**
 * 指定 index のビット値を設定（MSB-first）
 * - 1 = 無効（revoke 等）, 0 = 有効
 * - MSB-first: バイト内のビットは「左から右へ（7..0）」の順で数える
 * @param {Buffer} buf
 * @param {number} index - 0 始まりのビット位置
 * @param {0|1|boolean} bit - 1 (set), 0 (clear)
 * @returns {Buffer}
 */
export function setBit(buf, index, bit) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);           // ★ MSB-first（最上位ビットから）
  if (byteIndex < 0 || byteIndex >= buf.length) {
    throw new Error(`index が範囲外: index=${index}, byteIndex=${byteIndex}, buf.length=${buf.length}`);
  }
  const mask = 1 << bitIndex;
  if (bit) buf[byteIndex] |= mask;
  else buf[byteIndex] &= ~mask;
  return buf;
}

/**
 * 指定 index のビット値を取得（MSB-first）
 * - setBit と同じ規則で読み出す（片側だけ LSB-first だと不整合になる）
 * @param {Buffer} buf
 * @param {number} index - 0 始まりのビット位置
 * @returns {0|1} 取得したビット値
 */
export function getBit(buf, index) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);           // ★ MSB-first と揃える
  if (byteIndex < 0 || byteIndex >= buf.length) {
    throw new Error(`index が範囲外: index=${index}, byteIndex=${byteIndex}, buf.length=${buf.length}`);
  }
  const mask = 1 << bitIndex;
  return (buf[byteIndex] & mask) !== 0 ? 1 : 0;
}

/**
 * ビットセットを encodedList に変換（GZIP → base64url → 先頭 'u'）
 * - 仕様: walt.id / W3C Bitstring は Multibase base64url を要求
 * - Node 20+ は 'base64url' をサポート（+ / を使わず、末尾 = なし）
 * @param {Buffer} buf
 * @returns {string} 形式: 'u' + base64url
 */
export function gzipBase64(buf) {
  const gz = zlib.gzipSync(buf);
  return 'u' + gz.toString('base64url');      // ★ Multibase base64url
}

/**
 * StatusListCredential(JSON) を組み立て
 * - 安全のため、encodedList が 'u' で始まっていなければ付与
 */
export function buildStatusListCredentialJson({ url, purpose, encodedList, issuerDid }) {
  const encoded = encodedList?.startsWith('u') ? encodedList : ('u' + encodedList);
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "id": url,
    "type": ["VerifiableCredential", "BitstringStatusListCredential"],
    "issuer": issuerDid || "did:example:issuer",
    "validFrom": new Date().toISOString(),
    "credentialSubject": {
      "id": `${url}#list`,
      "type": "BitstringStatusList",
      "statusPurpose": purpose,   // 例: "revocation" / "suspension"
      "encodedList": encoded
    }
  };
}

/**
 * （任意・推奨）公開前セルフチェック
 * - 'u' プレフィックス確認
 * - gunzip 後のバイト長 = Math.ceil(sizeBits / 8)
 * @param {string} encodedList - 'u' + base64url
 * @param {number} sizeBits
 * @throws {Error} 不正な場合は例外
 */
export function assertEncodedList(encodedList, sizeBits) {
  if (!encodedList || encodedList[0] !== 'u') {
    throw new Error("encodedList は 'u' で始まる Multibase base64url 必須です");
  }
  const raw = zlib.gunzipSync(Buffer.from(encodedList.slice(1), 'base64url'));
  const expect = Math.ceil(sizeBits / 8);
  if (raw.length !== expect) {
    throw new Error(`encodedList 長さ不一致: 実際 ${raw.length} / 期待 ${expect} (sizeBits=${sizeBits})`);
  }
}
