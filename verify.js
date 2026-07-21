/**
 * APIレスポンスを確認し、一覧を取得する
 *
 * @param {Object} result APIレスポンス
 * @returns {Array<Object>} 一覧
 */
const getResultList = (result) => {
  if (!result?.success) {
    const error = new Error(
      result?.data?.message || 'Failed to retrieve credential list.'
    )

    error.status = result?.status
    error.data = result?.data

    throw error
  }

  return result.data?.list || []
}

/**
 * 一覧に発行対象を設定する
 *
 * @param {Array<Object>} list 一覧
 * @param {string} issueTarget 発行対象
 * @returns {Array<Object>} 発行対象設定済み一覧
 */
const setIssueTarget = (list, issueTarget) => {
  return list.map((item) => ({
    ...item,
    issueTarget,
  }))
}


/**
 * Credential Offer URL発行対象
 */
const issueTargets = {
  individual: 'individual',
  organization: 'organization',
}

/**
 * Credential Offer URL一覧を取得してStateに反映する
 */
const refreshCredentialList = async () => {
  setLoading(true)

  try {
    let credentialList = []

    switch (userInfoRole) {
      case roleTypes.individual: {
        // 個人向けCredential Offer URL一覧を取得する
        const result = await getCredentialOfferURLs(groupId)

        credentialList = setIssueTarget(
          getResultList(result),
          issueTargets.individual
        )

        break
      }

      case roleTypes.vcClient: {
        // 組織向けCredential Offer URL一覧を取得する
        const result =
          await getOrgCredentialOfferUrlList(groupId)

        credentialList = setIssueTarget(
          getResultList(result),
          issueTargets.organization
        )

        break
      }

      case roleTypes.vcAdmin: {
        // 個人向けおよび組織向け一覧を並行して取得する
        const [
          individualResult,
          organizationResult,
        ] = await Promise.all([
          getCredentialOfferURLs(groupId),
          getOrgCredentialOfferUrlList(groupId),
        ])

        const individualList = setIssueTarget(
          getResultList(individualResult),
          issueTargets.individual
        )

        const organizationList = setIssueTarget(
          getResultList(organizationResult),
          issueTargets.organization
        )

        credentialList = [
          ...individualList,
          ...organizationList,
        ]

        break
      }

      default: {
        const error = new Error('Unsupported user role.')
        error.status = 403
        throw error
      }
    }

    // 作成日時の降順に並び替える
    const sortedCredentialList = [...credentialList].sort(
      (a, b) =>
        new Date(b.createDate).getTime() -
        new Date(a.createDate).getTime()
    )

    // Credential Configuration一覧を取得する
    const configResult =
      await getCredentialConfigurations(
        LOCALIZE_PROCESS_TARGET.DISPLAY
      )

    const configurations = getResultData(configResult)

    // Typeと表示名のマップを作成する
    const credentialConfigMap =
      createCredentialConfigMap(configurations)

    // Stateに反映する
    setCredentialList(sortedCredentialList)
    setCredentialConfig(credentialConfigMap)
    setError(null)
  } catch (error) {
    logger.error(
      'Failed to refresh credential list: ',
      error
    )

    setError({
      status: error.status || 500,
      ...(error.data || {}),
      message:
        error.data?.message ||
        error.message ||
        'Failed to refresh credential list.',
    })
  } finally {
    setLoading(false)
  }
}
