/**
 * 基本4情報 Credential の定義と一致するか判定する
 *
 * @param {Object} params パラメータ
 * @param {string | null} params.vctLastPath VCT の最後のパス
 * @param {string[]} params.type Credential Definition Type
 * @returns {boolean} 基本4情報 Credential の定義と一致する場合 true
 */
const matchesBase4InfoCredential = ({ vctLastPath, type }) => {
  return (
    vctLastPath === BASE_4_INFO_VCT &&
    JSON.stringify(type) ===
      JSON.stringify(BASE_4_INFO_CREDENTIAL_DEFINITION_TYPE)
  )
}
