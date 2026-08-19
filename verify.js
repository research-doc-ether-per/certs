/**
 * credential configuration を type 単位に整理する
 *
 * 同一 type の複数 format をまとめ、画面表示用の一覧データを生成する。
 *
 * @param {Object} configurations locale 処理後の credential configurations
 * @returns {Object} type 単位に整理した credential configurations
 */
const groupCredentialConfigurationsByType = (configurations = {}) => {
  const groupedConfigurations = {}
  const typeDisplayNameMap = {}

  // 同一 type 内で使用する表示名を取得する
  Object.keys(configurations).forEach((key) => {
    const configuration = configurations[key]
    const format = configuration?.format || ''
    const type = key.replace(`_${format}`, '')
    const typeDisplayName =
      configuration?.credential_metadata?.display?.[0]?.name || type

    if (!typeDisplayNameMap[type] || typeDisplayNameMap[type] === type) {
      typeDisplayNameMap[type] = typeDisplayName
    }
  })

  Object.keys(configurations).forEach((key) => {
    const configuration = configurations[key]
    const format = configuration?.format || ''
    const type = key.replace(`_${format}`, '')
    const category = type === 'base_4_info' ? 'b4d' : type
    const typeDisplayName =
      type === 'base_4_info' && typeDisplayNameMap[type] === 'base_4_info'
        ? 'b4d'
        : typeDisplayNameMap[type]

    const claims = configuration?.credential_metadata?.claims || []

    if (groupedConfigurations[category]) {
      groupedConfigurations[category] = {
        ...groupedConfigurations[category],
        formats: [
          ...groupedConfigurations[category].formats,
          format,
        ],
      }

      return
    }

    groupedConfigurations[category] = {
      formats: [format],
      typeDisplayName,
      type,
      claims,
    }
  })

  return groupedConfigurations
}

/**
 * Credential Configuration 一覧を取得する
 *
 * @param {string} processTarget locale 処理対象
 * @param {boolean} shouldGroupByType type 単位に整理するかどうか
 * @returns {Promise<Object>} Credential Configuration 一覧
 */
const listCredentialConfigurations = async (
  processTarget,
  shouldGroupByType = false
) => {
  logger.debug('*** listCredentialConfigurations ***')

  try {
    const response = await fetch('/.well-known/openid-credential-verifier')
    const data = await response.json()
    const supported = data?.credential_configurations_supported || {}
    const supportedKeys = Object.keys(supported)

    if (supportedKeys.length === 0 || Object.values(supported) === 0) {
      throw new Error('Not found supported credentials.')
    }

    const configurations = localizeSupportedCredentialTypes(
      supported,
      '',
      processTarget
    )

    if (!shouldGroupByType) {
      return {
        success: true,
        data: configurations,
      }
    }

    const groupedConfigurations =
      groupCredentialConfigurationsByType(configurations)

    logger.debug('groupedConfigurations: ', groupedConfigurations)

    return {
      success: true,
      data: groupedConfigurations,
    }
  } catch (error) {
    logger.error('listCredentialConfigurations error.message: ', error.message)
    logger.error('listCredentialConfigurations error.stack: ', error.stack)

    return {
      success: false,
      error,
    }
  }
}
