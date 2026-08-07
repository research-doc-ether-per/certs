// permission:
//   # Access Token の resource_access から roles を取得する対象 clientId
//   roleClientId: wallet-api

//   # role の区切り文字
//   roleSeparator: "_"

//   # 証明書操作権限
//   types:
//     credentialReference:
//       code: r001
//       name: 証明書参照

//     credentialAcquire:
//       code: r002
//       name: 証明書取得

//     credentialPresentation:
//       code: r003
//       name: 証明書提示

//     credentialDelete:
//       code: r004
//       name: 証明書削除


import config from '@/config'

/**
 * 証明書操作権限種別
 */
export const PERMISSION_TYPES = {
  CREDENTIAL_REFERENCE: 'credentialReference',
  CREDENTIAL_ACQUIRE: 'credentialAcquire',
  CREDENTIAL_PRESENTATION: 'credentialPresentation',
  CREDENTIAL_DELETE: 'credentialDelete',
}

/**
 * 権限設定を取得する
 *
 * @returns {Object} 権限設定
 */
const getPermissionConfig = () => {
  return config?.permission || {}
}

/**
 * Access Token から権限確認対象 clientId の roles を取得する
 *
 * @param {Object} tokenParsed Keycloak tokenParsed
 * @returns {string[]} role 一覧
 */
export const getPermissionRolesFromToken = (tokenParsed = {}) => {
  const permissionConfig = getPermissionConfig()
  const roleClientId = permissionConfig.roleClientId

  if (!roleClientId) {
    return []
  }

  const roles = tokenParsed?.resource_access?.[roleClientId]?.roles

  return Array.isArray(roles) ? roles : []
}

/**
 * 権限種別に対応する権限コードを取得する
 *
 * @param {string} permissionType 権限種別
 * @returns {string | null} 権限コード
 */
export const getPermissionCode = (permissionType) => {
  const permissionConfig = getPermissionConfig()

  return permissionConfig?.types?.[permissionType]?.code || null
}

/**
 * 権限 role を生成する
 *
 * @param {string} groupId 組織 Wallet ID
 * @param {string} permissionCode 権限コード
 * @returns {string | null} 権限 role
 */
export const createPermissionRole = (groupId, permissionCode) => {
  if (!groupId || !permissionCode) {
    return null
  }

  const permissionConfig = getPermissionConfig()
  const roleSeparator = permissionConfig.roleSeparator || '_'

  return `${groupId}${roleSeparator}${permissionCode}`
}

/**
 * 指定された組織 Wallet に対する証明書操作権限を保持しているか確認する
 *
 * @param {Object} params パラメータ
 * @param {string[]} params.roles Access Token から取得した role 一覧
 * @param {string} params.groupId 組織 Wallet ID
 * @param {string} params.permissionType 権限種別
 * @returns {boolean} 権限を保持している場合 true
 */
export const hasPermission = ({ roles = [], groupId, permissionType }) => {
  if (!Array.isArray(roles) || !groupId || !permissionType) {
    return false
  }

  const permissionCode = getPermissionCode(permissionType)

  if (!permissionCode) {
    return false
  }

  const requiredRole = createPermissionRole(groupId, permissionCode)

  if (!requiredRole) {
    return false
  }

  return roles.includes(requiredRole)
}

/**
 * 選択中の組織 Wallet に対する証明書操作権限を取得する
 *
 * @param {Object} params パラメータ
 * @param {string[]} params.roles Access Token から取得した role 一覧
 * @param {string} params.groupId 組織 Wallet ID
 * @returns {Object} 証明書操作権限
 */
export const getCredentialPermissions = ({ roles = [], groupId }) => {
  return {
    canReference: hasPermission({
      roles,
      groupId,
      permissionType: PERMISSION_TYPES.CREDENTIAL_REFERENCE,
    }),
    canAcquire: hasPermission({
      roles,
      groupId,
      permissionType: PERMISSION_TYPES.CREDENTIAL_ACQUIRE,
    }),
    canPresent: hasPermission({
      roles,
      groupId,
      permissionType: PERMISSION_TYPES.CREDENTIAL_PRESENTATION,
    }),
    canDelete: hasPermission({
      roles,
      groupId,
      permissionType: PERMISSION_TYPES.CREDENTIAL_DELETE,
    }),
  }
}
