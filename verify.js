/**
 * Walt.id Wallet API のログインデータを準備する
 *
 * 個人ユーザの場合は OIDC 認証用データをそのまま返却する。
 * 組織ユーザの場合は、DB から取得した組織 Wallet 認証用 password を追加して返却する。
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Keycloak Realm 名
 * @param {string} params.userId リクエスト用ユーザID
 * @param {Object} params.waltIdLoginData Walt.id Wallet API 認証用リクエストデータ
 * @param {Object} walletDB Wallet DB
 * @returns {Promise<Object>} Walt.id Wallet API のログインデータ
 */
const prepareWaltIdWalletLoginData = async (
  { realmName, userId, waltIdLoginData },
  walletDB
) => {
  if (realmName !== keycloak.allowedRealms.organization) {
    return waltIdLoginData
  }

  const password = await getOrganizationWalletAuthPassword(
    {
      organizationUserId: userId,
      hasWallet: true,
    },
    walletDB
  )

  return {
    ...waltIdLoginData,
    password,
  }
}
