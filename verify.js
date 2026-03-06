const cbor = require('cbor')
const base64url = require('base64url')
const log4js = require('log4js')

const logger = log4js.getLogger()
logger.level = 'info'

/**
 * COSE Header のラベル定義
 */
const COSE_HEADER_LABELS = {
  1: 'alg',
  4: 'kid',
  33: 'x5chain'
}

/**
 * COSE alg の代表値
 */
const COSE_ALG_LABELS = {
  [-7]: 'ES256',
  [-35]: 'ES384',
  [-36]: 'ES512'
}

/**
 * Buffer を再帰解析しやすい形式に変換する
 */
const decodeBuffer = (buffer) => {
  const result = {
    type: 'Buffer',
    hex: buffer.toString('hex')
  }

  try {
    result.utf8 = buffer.toString('utf8')
  } catch (err) {
    // 何もしない
  }

  try {
    const decoded = cbor.decodeFirstSync(buffer)
    result.cbor = normalizeValue(decoded)
  } catch (err) {
    // CBOR でない場合は何もしない
  }

  return result
}

/**
 * 任意の値を再帰的に展開する
 */
const normalizeValue = (value) => {
  if (Buffer.isBuffer(value)) {
    return decodeBuffer(value)
  }

  if (value instanceof Map) {
    const obj = {}

    for (const [k, v] of value.entries()) {
      obj[String(k)] = normalizeValue(v)
    }

    return obj
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }

  if (value && typeof value === 'object') {
    const obj = {}

    for (const [k, v] of Object.entries(value)) {
      obj[k] = normalizeValue(v)
    }

    return obj
  }

  return value
}

/**
 * protected header をラベル付きで解析する
 */
const parseProtectedHeader = (protectedHeaderBuffer) => {
  const protectedHeaderMap = cbor.decodeFirstSync(protectedHeaderBuffer)

  const rawEntries = []
  const labeledEntries = {}

  for (const [key, value] of protectedHeaderMap.entries()) {
    const keyName = COSE_HEADER_LABELS[key] || `unknown(${key})`

    rawEntries.push({
      key,
      keyName,
      value: normalizeValue(value)
    })

    if (key === 1) {
      labeledEntries[keyName] = {
        raw: value,
        name: COSE_ALG_LABELS[value] || `unknown(${value})`
      }
    } else if (key === 4 && Buffer.isBuffer(value)) {
      labeledEntries[keyName] = {
        raw: normalizeValue(value),
        utf8: value.toString('utf8'),
        hex: value.toString('hex')
      }
    } else {
      labeledEntries[keyName] = normalizeValue(value)
    }
  }

  return {
    rawMap: normalizeValue(protectedHeaderMap),
    rawEntries,
    labeledEntries
  }
}

/**
 * unprotected header を解析する
 */
const parseUnprotectedHeader = (unprotectedHeader) => {
  return {
    raw: normalizeValue(unprotectedHeader)
  }
}

/**
 * payload を解析する
 */
const parsePayload = (payloadBuffer) => {
  if (!payloadBuffer) {
    return {
      rawBuffer: null,
      decoded: null
    }
  }

  let decoded = null

  try {
    decoded = cbor.decodeFirstSync(payloadBuffer)
  } catch (err) {
    decoded = null
  }

  return {
    rawBuffer: normalizeValue(payloadBuffer),
    decoded: normalizeValue(decoded)
  }
}

/**
 * signature を解析する
 */
const parseSignature = (signatureBuffer) => {
  if (!signatureBuffer) {
    return null
  }

  return {
    rawBuffer: normalizeValue(signatureBuffer),
    hex: signatureBuffer.toString('hex'),
    length: signatureBuffer.length
  }
}

/**
 * issuerAuth（COSE_Sign1）を解析する
 */
const parseIssuerAuth = (issuerAuth) => {
  if (!Array.isArray(issuerAuth) || issuerAuth.length !== 4) {
    throw new Error('issuerAuth is not a valid COSE_Sign1 structure')
  }

  const protectedHeaderBuffer = issuerAuth[0]
  const unprotectedHeader = issuerAuth[1]
  const payloadBuffer = issuerAuth[2]
  const signatureBuffer = issuerAuth[3]

  return {
    protectedHeader: parseProtectedHeader(protectedHeaderBuffer),
    unprotectedHeader: parseUnprotectedHeader(unprotectedHeader),
    payload: parsePayload(payloadBuffer),
    signature: parseSignature(signatureBuffer)
  }
}

/**
 * credential（Base64URL(CBOR(IssuerSigned))）を解析する
 */
const parseMdocCredential = (credential) => {
  const credentialBuffer = base64url.toBuffer(credential)
  const issuerSigned = cbor.decodeFirstSync(credentialBuffer)

  const namespaces =
    issuerSigned?.nameSpaces ||
    issuerSigned?.namespaces ||
    issuerSigned?.value?.nameSpaces ||
    issuerSigned?.value?.namespaces

  const issuerAuth =
    issuerSigned?.issuerAuth ||
    issuerSigned?.value?.issuerAuth

  if (!issuerAuth) {
    throw new Error('issuerAuth not found in decoded credential')
  }

  return {
    credential,
    credentialBuffer: normalizeValue(credentialBuffer),
    issuerSigned: normalizeValue(issuerSigned),
    namespaces: normalizeValue(namespaces),
    issuerAuth: normalizeValue(issuerAuth),
    parsedIssuerAuth: parseIssuerAuth(issuerAuth)
  }
}

/**
 * 解析結果を log4js で出力する
 */
const logParsedMdocCredential = (result) => {
  logger.info('===== credential =====')
  logger.info(JSON.stringify(result.credential, null, 2))

  logger.info('===== credentialBuffer =====')
  logger.info(JSON.stringify(result.credentialBuffer, null, 2))

  logger.info('===== issuerSigned =====')
  logger.info(JSON.stringify(result.issuerSigned, null, 2))

  logger.info('===== namespaces =====')
  logger.info(JSON.stringify(result.namespaces, null, 2))

  logger.info('===== issuerAuth =====')
  logger.info(JSON.stringify(result.issuerAuth, null, 2))

  logger.info('===== protectedHeader =====')
  logger.info(JSON.stringify(result.parsedIssuerAuth.protectedHeader, null, 2))

  logger.info('===== unprotectedHeader =====')
  logger.info(JSON.stringify(result.parsedIssuerAuth.unprotectedHeader, null, 2))

  logger.info('===== payload =====')
  logger.info(JSON.stringify(result.parsedIssuerAuth.payload, null, 2))

  logger.info('===== signature =====')
  logger.info(JSON.stringify(result.parsedIssuerAuth.signature, null, 2))
}

/**
 * 実行用サンプル
 */
const main = () => {
  try {
    const credential = '这里替换成 issuer 返回的 credential'

    const result = parseMdocCredential(credential)

    logParsedMdocCredential(result)
  } catch (err) {
    logger.error('mdoc credential 解析失敗')
    logger.error(err)
  }
}

main()
