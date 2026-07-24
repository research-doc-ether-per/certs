/**
 * VC payload から証明書タイプを取得する
 *
 * @param {Object} payload VC payload
 * @returns {string | null} 証明書タイプ
 */
const getCredentialTypeFromPayload = (payload = {}) => {
  const vct = payload.vct

  if (vct) {
    const vctLastPath = vct.split('/').pop()

    if (!vctLastPath) {
      return null
    }

    return vctLastPath === 'base_4_info' ? 'b4d' : vctLastPath
  }

  const credentialDefinitionType = payload.type || []

  if (
    Array.isArray(credentialDefinitionType) &&
    credentialDefinitionType.length >= 2
  ) {
    return credentialDefinitionType[credentialDefinitionType.length - 1] || null
  }

  return null
}
