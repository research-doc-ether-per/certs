
const cbor = require('cbor')
const base64url = require('base64url')

/**
 * COSE Header のキー定義
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
 * Buffer を見やすい形式に変換する
 */
const normalizeValue = (value) => {
  if (Buffer.isBuffer(value)) {
    return {
      type: 'Buffer',
      hex: value.toString('hex'),
      utf8: (() => {
        try {
          return value.toString('utf8')
        } catch {
          return null
        }
      })()
    }
  }

  if (value instanceof Map) {
    const obj = {}
    for (const [k, v] of value.entries()) {
      obj[String(k)] = normalizeValue(v)
    }
    return obj
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue)
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
 * Protected Header の内容を解析する
 */
const parseProtectedHeader = (protectedHeaderBuffer) => {
  const protectedHeaderMap = cbor.decodeFirstSync(protectedHeaderBuffer)

  const rawEntries = []
  const labeledEntries = {}

  for (const [key, value] of protectedHeaderMap.entries()) {
    rawEntries.push({
      key,
      keyName: COSE_HEADER_LABELS[key] || `unknown(${key})`,
      value: normalizeValue(value)
    })

    const label = COSE_HEADER_LABELS[key] || `unknown(${key})`

    if (key === 1) {
      labeledEntries[label] = {
        raw: value,
        name: COSE_ALG_LABELS[value] || `unknown(${value})`
      }
    } else if (key === 4 && Buffer.isBuffer(value)) {
      labeledEntries[label] = {
        raw: value,
        hex: value.toString('hex'),
        utf8: value.toString('utf8')
      }
    } else {
      labeledEntries[label] = normalizeValue(value)
    }
  }

  return {
    rawMap: protectedHeaderMap,
    normalized: normalizeValue(protectedHeaderMap),
    rawEntries,
    labeledEntries
  }
}

/**
 * Unprotected Header の内容を解析する
 */
const parseUnprotectedHeader = (unprotectedHeader) => {
  if (unprotectedHeader instanceof Map) {
    return {
      rawMap: unprotectedHeader,
      normalized: normalizeValue(unprotectedHeader)
    }
  }

  return {
    rawMap: unprotectedHeader,
    normalized: normalizeValue(unprotectedHeader)
  }
}

/**
 * issuerAuth（COSE_Sign1）を解析する
 * issuerAuth はすでに credential の decode 結果から取り出した値を想定
 */
const parseIssuerAuth = (issuerAuth) => {
  if (!Array.isArray(issuerAuth) || issuerAuth.length !== 4) {
    throw new Error('issuerAuth is not a valid COSE_Sign1 structure')
  }

  const protectedHeaderBuffer = issuerAuth[0]
  const unprotectedHeader = issuerAuth[1]
  const payloadBuffer = issuerAuth[2]
  const signatureBuffer = issuerAuth[3]

  const protectedHeader = parseProtectedHeader(protectedHeaderBuffer)
  const unprotected = parseUnprotectedHeader(unprotectedHeader)

  const payloadDecoded = payloadBuffer ? cbor.decodeFirstSync(payloadBuffer) : null

  return {
    protectedHeaderBuffer,
    protectedHeader,
    unprotectedHeader,
    unprotected,
    payloadBuffer,
    payloadDecoded: normalizeValue(payloadDecoded),
    signatureBuffer,
    signatureHex: Buffer.isBuffer(signatureBuffer) ? signatureBuffer.toString('hex') : null
  }
}

/**
 * credential（Base64URL(CBOR(IssuerSigned))）を解析する
 */
const parseMdocCredential = (credential) => {
  // Base64URL → Buffer
  const credentialBuffer = base64url.toBuffer(credential)

  // CBOR(IssuerSigned) を decode
  const issuerSigned = cbor.decodeFirstSync(credentialBuffer)

  // issuerSigned の中身を取得
  const namespaces = issuerSigned?.nameSpaces || issuerSigned?.namespaces || issuerSigned?.value?.nameSpaces || issuerSigned?.value?.namespaces
  const issuerAuth = issuerSigned?.issuerAuth || issuerSigned?.value?.issuerAuth

  if (!issuerAuth) {
    throw new Error('issuerAuth not found in decoded credential')
  }

  const parsedIssuerAuth = parseIssuerAuth(issuerAuth)

  return {
    credential,
    credentialBufferHex: credentialBuffer.toString('hex'),
    issuerSigned: normalizeValue(issuerSigned),
    namespaces: normalizeValue(namespaces),
    issuerAuth: normalizeValue(issuerAuth),
    parsedIssuerAuth
  }
}

/**
 * 解析結果を見やすく出力する
 */
const printMdocCredentialInfo = (result) => {
  console.log('===== credential =====')
  console.log(result.credential)

  console.log('\n===== credentialBufferHex =====')
  console.log(result.credentialBufferHex)

  console.log('\n===== namespaces =====')
  console.dir(result.namespaces, { depth: null })

  console.log('\n===== issuerAuth =====')
  console.dir(result.issuerAuth, { depth: null })

  console.log('\n===== protected header =====')
  console.dir(result.parsedIssuerAuth.protectedHeader.labeledEntries, { depth: null })

  console.log('\n===== unprotected header =====')
  console.dir(result.parsedIssuerAuth.unprotected.normalized, { depth: null })

  console.log('\n===== payload decoded =====')
  console.dir(result.parsedIssuerAuth.payloadDecoded, { depth: null })

  console.log('\n===== signature hex =====')
  console.log(result.parsedIssuerAuth.signatureHex)
}

/**
 * 使用例
 */
const main = () => {
  const credential = '这里替换成 issuer 返回的 credential 字符串'

  const result = parseMdocCredential(credential)

  printMdocCredentialInfo(result)
}

main()
