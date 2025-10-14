// utils/bitstring.js
import zlib from 'zlib';

export function createZeroBitset(sizeBits) {
  const sizeBytes = Math.ceil(sizeBits / 8);
  return Buffer.alloc(sizeBytes, 0);
}

// ★ 改为 MSB-first（最高位先）
export function setBit(buf, index, bit) {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);           // 关键改动
  const mask = 1 << bitIndex;
  if (bit) buf[byteIndex] |= mask;
  else buf[byteIndex] &= ~mask;
  return buf;
}

// ★ 保留原函数名，但返回 multibase base64url：'u' + base64url
export function gzipBase64(buf) {
  const gz = zlib.gzipSync(buf);
  return 'u' + gz.toString('base64url');      // 关键改动：base64url + 'u'
}

export function buildStatusListCredentialJson({ url, purpose, encodedList, issuerDid }) {
  // 安全起见，确保有 'u' 前缀
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
      "statusPurpose": purpose,
      "encodedList": encoded
    }
  };
}

// （可选，强烈建议）发布前自检：gunzip 后字节数是否等于 sizeBits/8
export function assertEncodedList(encodedList, sizeBits) {
  if (!encodedList || encodedList[0] !== 'u') throw new Error("encodedList 需以 'u' 开头（multibase base64url）");
  const raw = zlib.gunzipSync(Buffer.from(encodedList.slice(1), 'base64url'));
  const expect = Math.ceil(sizeBits / 8);
  if (raw.length !== expect) {
    throw new Error(`encodedList 长度不匹配：got ${raw.length}, expect ${expect} (sizeBits=${sizeBits})`);
  }
}

