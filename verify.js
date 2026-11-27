/**
 * VP定義一覧取得サービス
 * @param {Object} params パラメータ
 * @returns {Object} VP定義一覧
 */
const listVPDefinitions = async (params) => {
  logger.debug('*** listVPDefinitions start ***')
  logger.debug('params: ', JSON.stringify(params, null, 2))

  const { realmName, groupId } = params

  let result = {}

  try {
    const conditions = {}

    // Realm名に応じて公開条件を設定する
    if (
      realmName === keycloak.allowedRealms.individual ||
      realmName === keycloak.allowedRealms.organization
    ) {
      conditions.is_public = true
    } else if (realmName !== keycloak.allowedRealms.admin) {
      const error = new Error('Invalid realm.')
      error.code = 'ForbiddenRequestError'
      throw error
    }

    // グループIDを設定する
    const targetGroupId = groupId?.trim() || 'all'

    // VP定義情報を取得する
    let datas = await walletDBService.select('vp_definitions', {
      ...conditions,
      group_id: targetGroupId,
    })

    // 指定されたグループのVP定義情報が存在しない場合、
    // 共通のVP定義情報を取得する
    if (datas.length === 0 && targetGroupId !== 'all') {
      datas = await walletDBService.select('vp_definitions', {
        ...conditions,
        group_id: 'all',
      })
    }

    // レスポンス情報を整理する
    const list = datas.map((data) => {
      const {
        vcPolicies,
        vpPolicies,
        specificVcPolicies,
        dcql,
        createDate,
        updateDate,
        ...others
      } = data

      // Policy情報を整理する
      const policies = {
        vc_policies: vcPolicies,
        vp_policies: vpPolicies,
      }

      // VC個別Policyが存在する場合のみ追加する
      if (
        specificVcPolicies &&
        Object.keys(specificVcPolicies).length > 0
      ) {
        policies.specific_vc_policies = specificVcPolicies
      }

      // VP定義情報を整理する
      const vpDefinitions = {
        policies,
        dcqlQuery: dcql,
      }

      return {
        ...others,
        vpDefinitions,
        createDate: convertToUtcUnix(createDate),
        updateDate: convertToUtcUnix(updateDate),
      }
    })

    result = { list }

    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** listVPDefinitions end ***')
  }
}
