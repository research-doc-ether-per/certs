/**
 * 基本4情報の Credential かどうかを判定する
 *
 * @param {Object} payload VC payload
 * @returns {boolean} 基本4情報の Credential の場合 true
 */
const isBase4InfoCredential = (payload = {}) => {
  const vctLastPath = payload.vct ? payload.vct.split('/').pop() : null

  if (vctLastPath !== BASE_4_INFO_VCT) {
    return false
  }

  const credentialDefinitionType = payload.type || []

  if (!Array.isArray(credentialDefinitionType)) {
    return false
  }

  return (
    credentialDefinitionType.length ===
      BASE_4_INFO_CREDENTIAL_DEFINITION_TYPE.length &&
    BASE_4_INFO_CREDENTIAL_DEFINITION_TYPE.every(
      (type, index) => credentialDefinitionType[index] === type
    )
  )
}
