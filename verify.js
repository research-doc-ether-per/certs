
/**
 * VC JWT を検証・デコードする
 * デコードに失敗した場合は空の payload を返却する
 *
 * @param {string} credential VC JWT
 * @returns {Object} デコード結果
 */
const safeDecodeCredential = (credential) => {
  try {
    return validateAndDecodeVcJwt(credential)
  } catch (error) {
    logger.warn('error.message: ', error.message)
    return { payload: {} }
  }
}

/**
 * VC JWT を検証・デコードする
 *
 * デコードに失敗した場合は CertificateAddFailedError を返却する
 *
 * @param {string} credential VC JWT
 * @returns {Object} デコード結果
 */
const decodeCredentialForAdd = (credential) => {
  try {
    return validateAndDecodeVcJwt(credential)
  } catch (error) {
    error.code = 'CertificateAddFailedError'
    throw error
  }
}
