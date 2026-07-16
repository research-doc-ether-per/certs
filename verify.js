const validateCredentialSupport = async (params) => {
  logger.debug('**** validateCredentialSupport start ****')
  logger.debug('Parameters: ', JSON.stringify(params, null, 2))

  try {
    const { configId, type } = params

    // Credential Configuration一覧を取得する
    const credentialConfigurationsSupported =
      await getCredentialConfigurations()

    // 指定されたCredential Configuration情報を取得する
    const supportedInfo =
      credentialConfigurationsSupported?.[configId]

    logger.debug(
      'Supported credential configuration: ',
      JSON.stringify(supportedInfo, null, 2)
    )

    // 指定されたCredential Configurationが存在しない場合
    if (!supportedInfo) {
      throw new Error(
        `Unsupported credential_configuration_id: ${configId}`
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

      logger.debug(
        'Type extracted from credential_configuration_id: ',
        configIdType
      )

      // credential_configuration_idから取得したTypeを確認する
      if (type !== configIdType) {
        throw new Error(
          `Unsupported credential type: ${type}`
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
              'Invalid credential_definition.type.'
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
              'vct is not specified.'
            )
          }

          configurationType = vct.split('/').pop()

          break
        }

        default: {
          const error = new Error(
            `Unsupported credential format: ${format}`
          )
          error.code = 'InvalidParamsError'
          error.params = [format]
          throw error
        }
      }

      logger.debug(
        'Type extracted from credential configuration: ',
        configurationType
      )

      // Credential Configurationから取得したTypeを確認する
      if (type !== configurationType) {
        throw new Error(
          `Unsupported credential type: ${type}`
        )
      }
    }

    return supportedInfo
  } catch (error) {
    logger.error('Error message: ', error.message)
    logger.error('Error stack: ', error.stack)
    throw error
  } finally {
    logger.debug('**** validateCredentialSupport end ****')
  }
}
