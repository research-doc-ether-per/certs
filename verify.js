const cbor = require('cbor');
const { X509Certificate } = require('crypto');

const base64UrlToBuffer = (input) => {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(base64, 'base64');
};

const normalizeCborValue = (value) => {
  // cbor 库可能返回 Tagged，需要把 tag 24 的嵌套字节串继续解出来
  if (value && typeof value === 'object' && value.tag !== undefined && value.value !== undefined) {
    return normalizeCborValue(value.value);
  }
  return value;
};

const decodeNestedCbor = (value) => {
  let current = normalizeCborValue(value);

  // 某些字段会是 tag24(bstr(.cbor xxx)) 或直接 bytes
  while (Buffer.isBuffer(current) || current instanceof Uint8Array) {
    current = cbor.decodeFirstSync(Buffer.from(current));
    current = normalizeCborValue(current);
  }

  return current;
};

const mapToObject = (value) => {
  if (value instanceof Map) {
    const obj = {};
    for (const [k, v] of value.entries()) {
      obj[k] = mapToObject(v);
    }
    return obj;
  }
  if (Array.isArray(value)) {
    return value.map(mapToObject);
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = mapToObject(v);
    }
    return obj;
  }
  return value;
};

const parseIssuerSigned = (credentialBase64Url) => {
  const issuerSignedBytes = base64UrlToBuffer(credentialBase64Url);
  const issuerSignedRaw = cbor.decodeFirstSync(issuerSignedBytes);
  const issuerSigned = mapToObject(issuerSignedRaw);

  const issuerAuth = issuerSigned.issuerAuth;
  if (!issuerAuth || !Array.isArray(issuerAuth) || issuerAuth.length < 4) {
    throw new Error('issuerAuth is missing or invalid');
  }

  const [protectedBytes, unprotectedRaw, payloadRaw, signature] = issuerAuth;

  const protectedHeader = protectedBytes?.length
    ? mapToObject(cbor.decodeFirstSync(Buffer.from(protectedBytes)))
    : {};

  const unprotectedHeader = mapToObject(unprotectedRaw || {});

  // payload 一般是 MSO（有时外面还包了一层 tag24 / bstr）
  const mso = mapToObject(decodeNestedCbor(payloadRaw));

  // 取 x5chain
  const x5chain = unprotectedHeader[33];
  let certs = [];

  if (x5chain) {
    if (Array.isArray(x5chain)) {
      certs = x5chain.map((der) => new X509Certificate(Buffer.from(der)));
    } else {
      certs = [new X509Certificate(Buffer.from(x5chain))];
    }
  }

  const leafCert = certs[0];

  return {
    issuerSigned,
    issuerAuth: {
      protectedHeader,
      unprotectedHeader,
      signature: Buffer.from(signature).toString('hex'),
    },
    mso,
    issuerInfo: leafCert
      ? {
          subject: leafCert.subject,
          issuer: leafCert.issuer,
          validFrom: leafCert.validFrom,
          validTo: leafCert.validTo,
          serialNumber: leafCert.serialNumber,
        }
      : null,
    certChainCount: certs.length,
  };
};

// ===== 示例 =====
const credentialBase64Url = '你的 credential 字符串';
const result = parseIssuerSigned(credentialBase64Url);

console.log('issuerInfo =', result.issuerInfo);
console.log('protectedHeader =', result.issuerAuth.protectedHeader);
console.log('unprotectedHeader keys =', Object.keys(result.issuerAuth.unprotectedHeader));
console.log('mso =', result.mso);
