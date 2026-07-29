// 認可方式 小文字
const AUTH_METHOD_LOWER_TYPES = {
  PRE_AUTHORIZED: 'pre_authorized',
  PWD: 'pwd',
}

/**
 * 認可方式の一覧を生成する
 *
 * @param {string} authType DB から取得した認可方式
 * @returns {string[]} 認可方式一覧
 */
const createAuthMethodTypeList = (authType) => {
  switch (authType) {
    case AUTH_METHOD_TYPES.ALL:
      return [
        AUTH_METHOD_LOWER_TYPES.PRE_AUTHORIZED,
        AUTH_METHOD_LOWER_TYPES.PWD,
      ]

    case AUTH_METHOD_TYPES.PRE_AUTHORIZED:
      return [AUTH_METHOD_LOWER_TYPES.PRE_AUTHORIZED]

    case AUTH_METHOD_TYPES.PWD:
      return [AUTH_METHOD_LOWER_TYPES.PWD]

    default:
      return []
  }
}


const authType = rows?.[0]?.authType
const authTypes = createAuthMethodTypeList(authType)
