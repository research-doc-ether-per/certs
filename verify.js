/**
 * Walt.id から Credential JWT を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.waltidCredentialId Walt.id Credential ID
 * @param {Object} params.loginData Walt.id Wallet API ログインデータ
 * @returns {Promise<string | null>} Credential JWT
 */
const getCredentialJwtFromWaltId = async ({
  waltidCredentialId,
  loginData,
}) => {
  if (!waltidCredentialId) {
    return null
  }

  const { certJwtData } = await getWaltidCredentials({
    credentialId: waltidCredentialId,
    ...loginData,
  })

  return certJwtData || null
}

// Walt.id から証明書情報を取得
const jwt = await getCredentialJwtFromWaltId({
  waltidCredentialId,
  loginData,
})
