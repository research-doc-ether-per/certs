/**
 * Waltid Wallet API の認証用リクエストデータを生成する
 *
 * @param {Object} params
 * 認証データ生成に必要な情報
 *
 * @param {Object} params.kcUser
 * Keycloak Access Token から取得したユーザー情報
 *
 * @param {string} params.kcToken
 * Keycloak Access Token
 *
 * @param {string} params.realmName
 * Access Token から取得した Realm 名
 *
 * @param {string} params.userId
 * リクエストパラメータで指定されたユーザーID または組織 Wallet ID
 *
 * @param {Object} params.allowedRealms
 * 設定ファイルから取得した許可 Realm 情報
 *
 * @returns {Object}
 * Waltid Wallet API の login / register に利用するリクエストデータ
 */
const createWalletAuthPostData = ({
  kcUser,
  kcToken,
  realmName,
  userId,
  allowedRealms,
}) => {
  // 個人ユーザの場合
  if (realmName === allowedRealms.personal) {
    return {
      name: kcUser.preferred_username,
      type: 'oidc',
      token: kcToken,
    }
  }

  // 組織ユーザの場合
  if (realmName === allowedRealms.organization) {
    const email = createOrganizationWalletEmail(kcUser.iss, userId)

    return {
      name: kcUser.preferred_username,
      type: 'email',
      email,
      password: createPassHash(email),
    }
  }

  const error = new Error('未対応の Realm です')
  error.code = 'InvalidRequestError'
  error.params = [
    {
      key: 'realmName',
      value: realmName,
    },
  ]

  throw error
}
