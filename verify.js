
/**
 * 組織 Wallet 認証用 password を postData に追加する
 *
 * 組織ユーザの場合、DB から取得した password を postData に追加する。
 * 個人ユーザの場合は postData をそのまま返却する。
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Keycloak Realm 名
 * @param {string} params.userId リクエスト用ユーザID
 * @param {Object} params.postData Walt.id Wallet API 認証用リクエストデータ
 * @param {Object} walletDB Wallet DB
 * @returns {Promise<Object>} password 追加後の postData
 */
const appendOrganizationWalletPassword = async (
  { realmName, userId, postData },
  walletDB
) => {
  if (realmName !== keycloak.allowedRealms.organization) {
    return postData
  }

  const password = await getOrganizationWalletAuthPassword(
    {
      organizationUserId: userId,
      hasWallet: true,
    },
    walletDB
  )

  return {
    ...postData,
    password,
  }
}
