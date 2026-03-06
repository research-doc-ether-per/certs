const cbor = require('cbor');
const base64url = require('base64url');
const log4js = require('log4js');
const forge = require('node-forge');

const logger = log4js.getLogger();
logger.level = 'info';

/**
 * COSEヘッダーのラベル定義
 */
const COSE_HEADER_LABELS = {
  1: 'alg', // アルゴリズム
  4: 'kid', // キーID
  33: 'x5chain' // 証明書チェーン
};

/**
 * COSEアルゴリズムの代表値
 */
const COSE_ALG_LABELS = {
  [-7]: 'ES256',
  [-35]: 'ES384',
  [-36]: 'ES512'
};

/**
 * Bufferを再帰的に展開する
 */
const decodeBuffer = (buffer) => {
  const result = {
    type: 'Buffer',
    hex: buffer.toString('hex')
  };

  try {
    result.utf8 = buffer.toString('utf8');
  } catch (err) {
    // UTF8変換できない場合は無視
  }

  try {
    const decoded = cbor.decodeFirstSync(buffer);
    result.cbor = normalizeValue(decoded);
  } catch (err) {
    // CBOR変換できない場合は無視
  }

  return result;
};

/**
 * 任意の値を再帰的に展開する
 */
const normalizeValue = (value) => {
  if (Buffer.isBuffer(value)) {
    return decodeBuffer(value);
  }

  if (value instanceof Map) {
    const obj = {};
    for (const [k, v] of value.entries()) {
      obj[String(k)] = normalizeValue(v);
    }
    return obj;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    const obj = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = normalizeValue(v);
    }
    return obj;
  }

  return value;
};

/**
 * protectedヘッダーをラベル付きで解析する
 */
const parseProtectedHeader = (protectedHeaderBuffer) => {
  const protectedHeaderMap = cbor.decodeFirstSync(protectedHeaderBuffer);

  const rawEntries = [];
  const labeledEntries = {};

  for (const [key, value] of protectedHeaderMap.entries()) {
    const keyName = COSE_HEADER_LABELS[key] || `unknown(${key})`;

    rawEntries.push({
      key,
      keyName,
      value: normalizeValue(value)
    });

    if (key === 1) {
      labeledEntries[keyName] = {
        raw: value,
        name: COSE_ALG_LABELS[value] || `unknown(${value})`
      };
    } else if (key === 4 && Buffer.isBuffer(value)) {
      labeledEntries[keyName] = {
        raw: normalizeValue(value),
        utf8: value.toString('utf8'),
        hex: value.toString('hex')
      };
    } else {
      labeledEntries[keyName] = normalizeValue(value);
    }
  }

  return {
    rawMap: normalizeValue(protectedHeaderMap),
    rawEntries,
    labeledEntries
  };
};

/**
 * unprotectedヘッダーを解析する
 */
const parseUnprotectedHeader = (unprotectedHeader) => {
  return {
    raw: normalizeValue(unprotectedHeader)
  };
};

/**
 * payloadを解析する
 */
const parsePayload = (payloadBuffer) => {
  if (!payloadBuffer) {
    return {
      rawBuffer: null,
      decoded: null
    };
  }

  let decoded = null;
  try {
    decoded = cbor.decodeFirstSync(payloadBuffer);
  } catch (err) {
    decoded = null;
  }

  return {
    rawBuffer: normalizeValue(payloadBuffer),
    decoded: normalizeValue(decoded)
  };
};

/**
 * signatureを解析する
 */
const parseSignature = (signatureBuffer) => {
  if (!signatureBuffer) {
    return null;
  }

  return {
    rawBuffer: normalizeValue(signatureBuffer),
    hex: signatureBuffer.toString('hex'),
    length: signatureBuffer.length
  };
};

/**
 * IssuerAuth (COSE_Sign1) を解析する
 */
const parseIssuerAuth = (issuerAuth) => {
  if (!Array.isArray(issuerAuth) || issuerAuth.length !== 4) {
    throw new Error('issuerAuth is not a valid COSE_Sign1 structure');
  }

  const protectedHeaderBuffer = issuerAuth[0];
  const unprotectedHeader = issuerAuth[1];
  const payloadBuffer = issuerAuth[2];
  const signatureBuffer = issuerAuth[3];

  return {
    protectedHeader: parseProtectedHeader(protectedHeaderBuffer),
    unprotectedHeader: parseUnprotectedHeader(unprotectedHeader),
    payload: parsePayload(payloadBuffer),
    signature: parseSignature(signatureBuffer)
  };
};

/**
 * credential (Base64URL(CBOR(IssuerSigned))) を解析する
 */
const parseMdocCredential = (credential) => {
  const credentialBuffer = base64url.toBuffer(credential);
  const issuerSigned = cbor.decodeFirstSync(credentialBuffer);

  const namespaces =
    issuerSigned?.nameSpaces ||
    issuerSigned?.namespaces ||
    issuerSigned?.value?.nameSpaces ||
    issuerSigned?.value?.namespaces;

  const issuerAuth =
    issuerSigned?.issuerAuth ||
    issuerSigned?.value?.issuerAuth;

  if (!issuerAuth) {
    throw new Error('issuerAuth not found in decoded credential');
  }

  return {
    credential,
    credentialBuffer: normalizeValue(credentialBuffer),
    issuerSigned: normalizeValue(issuerSigned),
    namespaces: normalizeValue(namespaces),
    issuerAuth: normalizeValue(issuerAuth),
    parsedIssuerAuth: parseIssuerAuth(issuerAuth)
  };
};

/**
 * X509証明書を解析する（DER形式）
 */
const parseX509 = (buffer) => {
  try {
    const der = forge.util.createBuffer(buffer.toString('binary'));
    const asn1 = forge.asn1.fromDer(der);
    const cert = forge.pki.certificateFromAsn1(asn1);

    return {
      subject: cert.subject.attributes,
      issuer: cert.issuer.attributes,
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter
    };
  } catch (err) {
    return {
      error: 'certificate parse failed'
    };
  }
};

/**
 * x5chainを解析する
 */
const parseX5Chain = (x5chain) => {
  const result = [];
  for (const certBuffer of x5chain) {
    const parsed = parseX509(certBuffer);
    result.push(parsed);
  }
  return result;
};

/**
 * 解析結果を log4js で出力する
 */
const logParsedMdocCredential = (result) => {
  logger.info('===== credential =====');
  logger.info(JSON.stringify(result.credential, null, 2));

  logger.info('===== credentialBuffer =====');
  logger.info(JSON.stringify(result.credentialBuffer, null, 2));

  logger.info('===== issuerSigned =====');
  logger.info(JSON.stringify(result.issuerSigned, null, 2));

  logger.info('===== namespaces =====');
  logger.info(JSON.stringify(result.namespaces, null, 2));

  logger.info('===== issuerAuth =====');
  logger.info(JSON.stringify(result.issuerAuth, null, 2));

  logger.info('===== protectedHeader =====');
  logger.info(JSON.stringify(result.parsedIssuerAuth.protectedHeader, null, 2));

  logger.info('===== unprotectedHeader =====');
  logger.info(JSON.stringify(result.parsedIssuerAuth.unprotectedHeader, null, 2));

  logger.info('===== payload =====');
  logger.info(JSON.stringify(result.parsedIssuerAuth.payload, null, 2));

  logger.info('===== signature =====');
  logger.info(JSON.stringify(result.parsedIssuerAuth.signature, null, 2));

  // X5Chain証明書の詳細を表示
  const x5chain = result.parsedIssuerAuth.unprotectedHeader.raw['33'];
  if (x5chain) {
    const certInfo = parseX5Chain(x5chain.map((i) => Buffer.from(i.hex, 'hex')));
    logger.info('===== X509 Certificates =====');
    logger.info(JSON.stringify(certInfo, null, 2));
  }

  // payload内の具体的なデータをもう一度確認
  logger.info('===== payload decoded =====');
  logger.info(JSON.stringify(result.parsedIssuerAuth.payload.decoded, null, 2));
};

/**
 * 実行用サンプル
 */
const main = () => {
  try {
    const credential = 'ここにissuerから返ってきたcredentialのBase64URL文字列を入れる';

    const result = parseMdocCredential(credential);

    logParsedMdocCredential(result);
  } catch (err) {
    logger.error('mdoc credential 解析失敗');
    logger.error(err);
  }
};

main();
