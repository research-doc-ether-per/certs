/**
 * Realm 名に応じて Owner ID から元のユーザIDを取得する
 *
 * 個人ユーザの場合は Owner ID をそのまま返却する。
 * 組織ユーザの場合は Owner ID から Keycloak Issuer を除去し、グループIDを返却する。
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Keycloak Realm 名
 * @param {Object} params.kcUser Keycloak ユーザ情報
 * @param {string} params.ownerId Owner ID
 * @returns {string} 元のユーザIDまたはグループID
 */
const getOriginalUserIdByRealmName = ({ realmName, kcUser, ownerId }) => {
  if (realmName === keycloak.allowedRealms.individual) {
    return ownerId
  }

  if (realmName === keycloak.allowedRealms.organization) {
    if (ownerId.startsWith(kcUser.iss)) {
      return ownerId.replace(kcUser.iss, '')
    }

    const error = new Error(
      `Invalid organization ownerId. ownerId does not start with issuer. ownerId: ${ownerId}`
    )
    error.code = 'InvalidRequestError'
    error.params = [ownerId]

    throw error
  }

  const error = new Error(`Unsupported realm. realmName: ${realmName}`)
  error.code = 'InvalidParamsError'
  error.params = [realmName]

  throw error
}

/**
 * Owner ID からリクエスト用ユーザ情報を取得する
 *
 * Owner ID は、個人ユーザの場合はユーザID、
 * 組織ユーザの場合は Keycloak Issuer とグループIDを連結したIDとして扱う。
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Keycloak Realm 名
 * @param {Object} params.kcUser Keycloak ユーザ情報
 * @param {string} params.kcToken Keycloak Access Token
 * @param {string} params.ownerId Owner ID
 * @returns {Object} リクエスト用ユーザ情報
 */
const getRequestUserInfoFromOwnerId = ({
  realmName,
  kcUser,
  kcToken,
  ownerId,
}) => {
  const userId = getOriginalUserIdByRealmName({
    realmName,
    kcUser,
    ownerId,
  })

  return getRequestUserInfoByRealmName({
    realmName,
    kcUser,
    kcToken,
    userId,
  })
}
