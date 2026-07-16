/**
 * クレデンシャル設定のサポート可否を確認する
 *
 * typeが指定されている場合、以下を確認する。
 * 1. credential_configuration_idからformatを除いた値とtypeが一致すること
 * 2. formatに応じてCredential Configurationから取得したTypeとtypeが一致すること
 *
 * @param {Object} params パラメーター
 * @param {string} params.configId Credential Configuration ID
 * @param {string} [params.type] クレデンシャルタイプ
 * @returns {Promise<Object>} Credential Configuration情報
 */
const validateCredentialSupport = async (params) => {
  logger.debug('**** validateCredentialSupport start ****')
  logger.debug('params: ', JSON.stringify(params, null, 2))

  try {
    const { configId, type } = params

    // Credential Configuration一覧を取得する
    const credentialConfigurationsSupported =
      await getCredentialConfigurations()

    // 指定されたCredential Configuration情報を取得する
    const supportedInfo =
      credentialConfigurationsSupported?.[configId]

    logger.debug(
      'supportedInfo: ',
      JSON.stringify(supportedInfo, null, 2)
    )

    // 指定されたCredential Configurationが存在しない場合
    if (!supportedInfo) {
      throw new Error(
        `サポートされていない credential_configuration_id: ${configId}`
      )
    }

    // typeが指定されている場合のみTypeを確認する
    if (type) {
      const { format } = supportedInfo
      const formatSuffix = `_${format}`

      // credential_configuration_idの末尾からformatを除去してTypeを取得する
      const configIdType = configId.endsWith(formatSuffix)
        ? configId.slice(0, -formatSuffix.length)
        : configId

      logger.debug('configIdType: ', configIdType)

      // credential_configuration_idから取得したTypeを確認する
      if (type !== configIdType) {
        throw new Error(
          `サポートされていない type: ${type}`
        )
      }

      let configurationType

      switch (format) {
        case 'jwt_vc_json': {
          // JWT VCの場合はcredential_definition.typeからTypeを取得する
          const credentialDefinitionTypes =
            supportedInfo?.credential_definition?.type

          if (
            !Array.isArray(credentialDefinitionTypes) ||
            credentialDefinitionTypes.length < 2
          ) {
            throw new Error(
              'credential_definition.typeが不正です。'
            )
          }

          configurationType =
            credentialDefinitionTypes[
              credentialDefinitionTypes.length - 1
            ]

          break
        }

        case 'vc+sd-jwt': {
          // SD-JWT VCの場合はvctの末尾からTypeを取得する
          const { vct } = supportedInfo

          if (!vct) {
            throw new Error(
              'vctが指定されていません。'
            )
          }

          configurationType = vct.split('/').pop()

          break
        }

        default: {
          const error = new Error(
            `サポートされていない credential format: ${format}`
          )
          error.code = 'InvalidParamsError'
          error.params = [format]
          throw error
        }
      }

      logger.debug(
        'configurationType: ',
        configurationType
      )

      // Credential Configurationから取得したTypeを確認する
      if (type !== configurationType) {
        throw new Error(
          `サポートされていない type: ${type}`
        )
      }
    }

    return supportedInfo
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('**** validateCredentialSupport end ****')
  }
}
