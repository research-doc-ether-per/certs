// utils/bitstring.js (Node 20+)
import zlib from 'zlib';

/** 指定ビット数で 0 埋めのビットセットを作成 */
export function createZeroBitset(sizeBits) {
  const sizeBytes = Math.ceil(sizeBits / 8);
  return Buffer.alloc(sizeBytes, 0);
}

/** index のビットを 0/1 に設定（1 = 無効、0 = 有効） */
export function setBit(buf, index, bit) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  if (bit) buf[byteIndex] |= (1 << bitIndex);
  else buf[byteIndex] &= ~(1 << bitIndex);
  return buf;
}

/** GZIP → Base64URL（=/-、パディング無し） */
export function gzipBase64Url(buf) {
  const gz = zlib.gzipSync(buf);
  return gz.toString('base64url'); // Node 20+ OK
}

/** Multibase の base64url へ（先頭に 'u' を付ける。重複付与はしない） */
export function toMultibaseBase64Url(b64url) {
  return b64url.startsWith('u') ? b64url : `u${b64url}`;
}

/** まとめ：GZIP → Base64URL → Multibase（'u' + …） */
export function gzipBase64UrlMultibase(buf) {
  return toMultibaseBase64Url(gzipBase64Url(buf));
}

/** 後方互換（呼ばれても Multibase base64url を返すように統一） */
export const gzipBase64 = gzipBase64UrlMultibase;

/** Bitstring Status List Credential(JSON) を組み立て */
export function buildStatusListCredentialJson({ url, purpose, encodedList, issuerDid }) {
  // 安全のため、ここでも 'u' を強制
  const multibaseEncoded = toMultibaseBase64Url(encodedList);
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "id": url,
    "type": ["VerifiableCredential", "BitstringStatusListCredential"],
    "issuer": issuerDid || "did:example:issuer",
    "validFrom": new Date().toISOString(),
    "credentialSubject": {
      "id": `${url}#list`,
      "type": "BitstringStatusList",
      "statusPurpose": purpose,
      "encodedList": multibaseEncoded
    }
  };
}
