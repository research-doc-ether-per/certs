/**
 * 基本4情報の Credential かどうかを判定する
 *
 * @param {Object} params パラメータ
 * @param {string} params.vct VCT
 * @param {string[]} params.type Credential Definition Type
 * @returns {boolean} 基本4情報の Credential の場合 true
 */
const isBase4InfoCredential = ({ vct, type }) => {
  const vctLastPath = vct ? vct.split('/').pop() : null

  return (
    vctLastPath === BASE_4_INFO_VCT &&
    JSON.stringify(type) ===
      JSON.stringify(BASE_4_INFO_CREDENTIAL_DEFINITION_TYPE)
  )
}
