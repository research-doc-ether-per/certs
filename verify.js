/**
 * 認可方式の表示用 object を生成する
 *
 * @param {string[]} authTypes 認可方式一覧
 * @param {Object} authTypeLabels 認可方式表示名定義
 * @returns {Object} 認可方式表示用 object
 */
const createAuthTypeDisplayObject = (authTypes = [], authTypeLabels = {}) => {
  return authTypes.reduce((result, authType) => {
    result[authType] = authTypeLabels[authType] || authType
    return result
  }, {})
}
