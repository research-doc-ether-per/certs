/**
 * path に従って object に値を設定する
 *
 * @param {Object} target 設定対象 object
 * @param {string[]} path 設定対象 path
 * @param {*} value 設定値
 */
const setValueByPath = (target, path = [], value) => {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return
  }

  let current = target

  path.forEach((key, index) => {
    const isLast = index === path.length - 1

    if (isLast) {
      current[key] = value
      return
    }

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }

    current = current[key]
  })
}

/**
 * path に従って object の値を削除する
 *
 * @param {Object} target 削除対象 object
 * @param {string[]} path 削除対象 path
 */
const deleteValueByPath = (target, path = []) => {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return
  }

  let current = target

  for (let index = 0; index < path.length - 1; index++) {
    current = current?.[path[index]]

    if (!current || typeof current !== 'object') {
      return
    }
  }

  delete current[path[path.length - 1]]
}


/**
 * Credential Offer 発行用 payload を生成する
 *
 * metadata claims の path に従って、発行日時、有効期限、docId を credentialData に設定する。
 *
 * @param {Object} params パラメータ
 * @param {string} params.issuerKey Issuer key
 * @param {string} params.issuerDid Issuer DID
 * @param {Object} params.offerData Offer data
 * @param {string} params.issuanceDate 発行日時
 * @param {string|null} params.expirationDate 有効期限
 * @param {string[]} params.issuanceDatePath 発行日時 path
 * @param {string[]} params.expirationDatePath 有効期限 path
 * @param {string} params.docId ドキュメントID
 * @param {string[]} params.docIdPath ドキュメントID path
 * @param {string} params.format Credential format
 * @returns {Object} 共通 payload
 */
const prepareCredentialOfferPayload = ({
  issuerKey,
  issuerDid,
  offerData,
  issuanceDate,
  expirationDate,
  issuanceDatePath,
  expirationDatePath,
  docId,
  docIdPath,
  format,
}) => {
  const {
    credentialConfigurationId,
    credentialData,
    selectiveDisclosure,
    authenticationMethod,
  } = offerData

  let payload = {
    issuerKey,
    issuerDid,
    credentialConfigurationId,
    credentialData: {
      '@context': ctxByFormat[format],
      ...credentialData,
      type: ['VerifiableCredential', credentialData?.type],
    },
    standardVersion: 'DRAFT13',
    authenticationMethod,
  }

  // 発行日時を metadata claims の path に従って設定する
  if (issuanceDate && Array.isArray(issuanceDatePath)) {
    setValueByPath(payload.credentialData, issuanceDatePath, issuanceDate)
  }

  // 有効期限を metadata claims の path に従って設定する
  if (expirationDate && Array.isArray(expirationDatePath)) {
    setValueByPath(payload.credentialData, expirationDatePath, expirationDate)
  }

  // 有効期限が指定されていない場合は、metadata claims の path に従って削除する
  if (!expirationDate && Array.isArray(expirationDatePath)) {
    deleteValueByPath(payload.credentialData, expirationDatePath)
  }

  // docId を metadata claims の path に従って設定する
  if (docId && Array.isArray(docIdPath)) {
    setValueByPath(payload.credentialData, docIdPath, docId)
  }

  switch (format) {
    case FORMAT_TYPES.VC_JWT:
      payload = {
        ...payload,
      }
      break

    case FORMAT_TYPES.VC_SD_JWT:
      payload = {
        ...payload,
        selectiveDisclosure,
      }
      break

    default: {
      const error = new Error(`Unsupported credential format. format: ${format}`)
      error.code = 'InvalidParamsError'
      error.params = [format]
      throw error
    }
  }

  return payload
}
