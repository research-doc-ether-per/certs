/**
 * base64url文字列をBufferに変換する
 */
const base64UrlDecode = (base64url) => {
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(base64url.length / 4) * 4, "=")

  return Buffer.from(base64, "base64")
}

/**
 * Bufferをbase64url文字列に変換する
 */
const base64UrlEncode = (buffer) => {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

/**
 * credential(base64url)をdocument(hex)に変換する
 */
const credentialToHex = (credentialBase64Url, docType) => {

  /** credentialをdecodeしてissuerSignedを取得 */
  const issuerSignedBuffer = base64UrlDecode(credentialBase64Url)

  const issuerSigned = cbor.decodeFirstSync(issuerSignedBuffer)

  /** MDoc構造を作成 */
  const mdoc = {
    docType,
    issuerSigned,
    deviceSigned: null
  }

  /** CBOR encodeしてHEXに変換 */
  return cbor.encodeCanonical(mdoc).toString("hex")
}

/**
 * document(hex)をcredential(base64url)に戻す
 *
 */
const hexToCredential = (documentHex) => {

  /** HEXをBufferに変換 */
  const buffer = Buffer.from(documentHex, "hex")

  /** CBOR decode */
  const decoded = cbor.decodeFirstSync(buffer)

  /** issuerSigned部分を取得 */
  const issuerSigned = decoded.issuerSigned

  /** issuerSignedをCBOR encode */
  const issuerSignedBuffer = cbor.encodeCanonical(issuerSigned)

  /** base64urlに変換 */
  return base64UrlEncode(issuerSignedBuffer)
}
