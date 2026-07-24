/**
 * VC payload から証明書タイプを取得する
 *
 * @param {Object} payload VC payload
 * @param {string} format VC フォーマット
 * @returns {string | null} 証明書タイプ
 */
const getCredentialTypeFromPayload = (payload = {}, format = '') => {
  const credentialDefinitionType = payload.type || []
  const vctLastPath = payload.vct ? payload.vct.split('/').pop() : null

  if (format === 'vc+sd-jwt') {
    if (!vctLastPath) {
      return null
    }

    return vctLastPath === 'base_4_info' ? 'b4d' : vctLastPath
  }

  if (
    Array.isArray(credentialDefinitionType) &&
    credentialDefinitionType.length >= 2
  ) {
    return credentialDefinitionType[credentialDefinitionType.length - 1] || null
  }

  return null
}
