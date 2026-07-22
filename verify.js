/**
 * VC Registry APIのアクセストークンを取得する
 *
 * @returns {Promise<string>} アクセストークン
 */
const getVcRegistryApiToken = async () => {
  return getClientCredentialsToken({
    realmName: 'groupcertAuth',
    clientID: 'vc-registry-api',
  })
}
