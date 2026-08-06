// src/middleware/permission.js

const log4js = require('log4js')
const permissionConfig = require('../config/permissionConfig.json')

const logger = log4js.getLogger('permission')

/**
 * group tree に指定 groupId が存在するか確認する
 *
 * @param {Object} groupTree convertGroupsToNestedTree で変換した group tree
 * @param {string} groupId 確認対象 groupId
 * @returns {boolean} 存在する場合 true
 */
const hasGroupInTree = (groupTree = {}, groupId) => {
  if (!groupTree || !groupId) {
    return false
  }

  const levels = String(groupId).split('/').filter(Boolean)

  if (levels.length === 0) {
    return false
  }

  let current = groupTree

  for (const level of levels) {
    if (!current[level]) {
      return false
    }

    current = current[level]
  }

  return true
}

/**
 * 権限確認対象 Realm か確認する
 *
 * @param {string} realmName Keycloak Realm 名
 * @returns {boolean} 対象 Realm の場合 true
 */
const isPermissionTargetRealm = (realmName) => {
  const targetRealms = permissionConfig.targetRealms || []

  return targetRealms.includes(realmName)
}

/**
 * 権限種別に対応する権限コードを取得する
 *
 * @param {string} permissionType 権限種別
 * @returns {string|null} 権限コード
 */
const getPermissionCode = (permissionType) => {
  return permissionConfig.permissionTypes?.[permissionType]?.code || null
}

/**
 * 証明書操作権限を確認する
 *
 * 組織ユーザの場合、Path Parameter の userId を groupId として扱い、
 * Access Token の groups および roles をもとに、
 * 指定された証明書操作権限を保持しているか確認する。
 *
 * @param {string} permissionType 権限種別
 * @returns {Function} Express middleware
 */
const checkPermission = (permissionType) => {
  return (req, res, next) => {
    logger.debug('*** checkPermission start ***')

    try {
      const kcUser = req.kcUser || {}
      const realmName = kcUser.realmName

      logger.debug('realmName: ', realmName)
      logger.debug('permissionType: ', permissionType)

      // 組織ユーザ以外の場合は権限確認を行わない
      if (!isPermissionTargetRealm(realmName)) {
        return next()
      }

      const permissionCode = getPermissionCode(permissionType)

      if (!permissionCode) {
        const error = new Error(
          `Unsupported permission type. permissionType: ${permissionType}`
        )
        error.code = 'InvalidParamsError'
        error.params = [permissionType]

        throw error
      }

      // 組織ユーザの場合、path parameter の userId を groupId として扱う
      const groupId = req.params?.userId
      const groupTree = kcUser.groups || {}
      const roles = Array.isArray(kcUser.roles) ? kcUser.roles : []

      logger.debug('groupId: ', groupId)
      logger.debug('groupTree: ', JSON.stringify(groupTree, null, 2))
      logger.debug('roles: ', JSON.stringify(roles, null, 2))

      if (!groupId) {
        const error = new Error('groupId is required.')
        error.code = 'InvalidParamsError'
        error.params = ['userId']

        throw error
      }

      if (!hasGroupInTree(groupTree, groupId)) {
        const error = new Error(
          `User does not belong to group. groupId: ${groupId}`
        )
        error.code = 'ForbiddenError'
        error.params = [groupId]

        throw error
      }

      const roleSeparator = permissionConfig.roleSeparator || '_'
      const requiredRole = `${groupId}${roleSeparator}${permissionCode}`

      logger.debug('requiredRole: ', requiredRole)

      if (!roles.includes(requiredRole)) {
        const error = new Error(
          `Permission denied. groupId: ${groupId}, requiredRole: ${requiredRole}`
        )
        error.code = 'ForbiddenError'
        error.params = [groupId, requiredRole]

        throw error
      }

      return next()
    } catch (error) {
      logger.error('error.message: ', error.message)
      logger.error('error.stack: ', error.stack)

      return next(error)
    } finally {
      logger.debug('*** checkPermission end ***')
    }
  }
}

module.exports = {
  checkPermission,
  hasGroupInTree,
}
