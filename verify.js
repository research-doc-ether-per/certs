// 一覧を取得してStateに反映する
const refreshCredentialList = async () => {
  setLoading(true)

  try {
    let result

    switch (userInfoRole) {
      case roleTypes.vcClient:
        // 組織ユーザー向けCredential Offer URL一覧を取得する
        result = await getOrgCredentialOfferUrlList(groupId)
        break

      case roleTypes.individual:
        // 個人ユーザー向けCredential Offer URL一覧を取得する
        result = await getCredentialOfferURLs(groupId)
        break

      case roleTypes.vcAdmin: {
        // 個人向けおよび組織向けの一覧を並行して取得する
        const [
          individualResult,
          organizationResult,
        ] = await Promise.all([
          getCredentialOfferURLs(groupId),
          getOrgCredentialOfferUrlList(groupId),
        ])

        // 個人向け一覧の取得に失敗した場合
        if (!individualResult.success) {
          setError({
            status: individualResult.status,
            ...individualResult.data,
          })
          return
        }

        // 組織向け一覧の取得に失敗した場合
        if (!organizationResult.success) {
          setError({
            status: organizationResult.status,
            ...organizationResult.data,
          })
          return
        }

        // 個人向けと組織向けの一覧を結合する
        result = {
          success: true,
          data: {
            list: [
              ...(individualResult.data?.list || []),
              ...(organizationResult.data?.list || []),
            ],
          },
        }

        break
      }

      default:
        setError({
          status: 403,
          message: 'Unsupported user role.',
        })
        return
    }

    if (!result?.success) {
      setError({
        status: result?.status,
        ...result?.data,
      })
      return
    }

    // 作成日時の降順に並び替える
    const dataList = [
      ...(result.data?.list || []),
    ].sort((a, b) => {
      return (
        new Date(b.createDate).getTime() -
        new Date(a.createDate).getTime()
      )
    })

    // Credential Configuration一覧を取得する
    const configResult =
      await getCredentialConfigurations(
        LOCALIZE_PROCESS_TARGET.DISPLAY
      )

    const configurations = configResult.success
      ? configResult.data || {}
      : {}

    // typeと表示名のマップを作成する
    const tempConfig = {}

    Object.keys(configurations).forEach((key) => {
      const configuration = configurations[key]

      const format = configuration?.format
      const formatSuffix = format
        ? `_${format}`
        : ''

      const type =
        formatSuffix && key.endsWith(formatSuffix)
          ? key.slice(0, -formatSuffix.length)
          : key

      const typeDisplayName =
        configuration
          ?.credential_metadata
          ?.display?.[0]
          ?.name || type

      if (!tempConfig[type]) {
        tempConfig[type] = typeDisplayName
      }
    })

    // 必要なStateを更新する
    setCredentialList(dataList)
    setCredentialConfig(tempConfig)
    setError(null)
  } catch (error) {
    logger.error(
      'Failed to refresh credential list: ',
      error
    )

    setError({
      status: 500,
      message:
        error.message ||
        'Failed to refresh credential list.',
    })
  } finally {
    setLoading(false)
  }
}
