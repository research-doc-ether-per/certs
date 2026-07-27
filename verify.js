/**
 * Realm 名に応じてリクエスト用ユーザ情報を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Keycloak Realm 名
 * @param {Object} params.kcUser Keycloak ユーザ情報
 * @param {string} params.userId ユーザIDまたはグループID
 * @returns {Object} リクエスト用ユーザ情報
 */
const getRequestUserInfoByRealmName = ({ realmName, kcUser, userId }) => {
  if (realmName === keycloak.allowedRealms.individual) {
    return {
      userId,
    }
  }

  if (realmName === keycloak.allowedRealms.organization) {
    return {
      userId: `${kcUser.iss}${userId}`,
      groupId: userId,
    }
  }

  const error = new Error(`Unsupported realm. realmName: ${realmName}`)
  error.code = 'InvalidParamsError'
  error.params = [realmName]

  throw error
}
