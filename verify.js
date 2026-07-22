/**
 * Realm名とClient IDに一致するKeycloak設定を取得する
 *
 * @param {string} realmName Realm名
 * @param {string} clientID Client ID
 * @returns {Object} Keycloak設定
 */
const getKeycloakClientConfig = (realmName, clientID) => {
  for (const [iss, configValue] of Object.entries(keycloakConfig)) {
    // Realm配下にClientが1件のみの場合と複数件の場合を統一して扱う
    const clientConfigs = Array.isArray(configValue)
      ? configValue
      : [configValue]

    const clientConfig = clientConfigs.find(
      (config) =>
        config.realmName === realmName &&
        config.clientID === clientID
    )

    if (clientConfig) {
      return {
        iss,
        ...clientConfig,
      }
    }
  }

  const error = new Error(
    `Keycloak client configuration not found. realmName: ${realmName}, clientID: ${clientID}`
  )
  error.code = 'KeycloakConfigNotFound'
  error.params = [realmName, clientID]

  throw error
}


/**
 * 指定されたRealmおよびClientのアクセストークンを取得する
 *
 * @param {Object} params パラメーター
 * @param {string} params.realmName Realm名
 * @param {string} params.clientID Client ID
 * @returns {Promise<string>} アクセストークン
 */
const getClientCredentialsToken = async ({
  realmName,
  clientID,
}) => {
  logger.debug('**** getClientCredentialsToken start ****')
  logger.debug('Realm name: ', realmName)
  logger.debug('Client ID: ', clientID)

  try {
    // Realm名とClient IDに一致する設定を取得する
    const cfg = getKeycloakClientConfig(
      realmName,
      clientID
    )

    // Token Endpoint URLを生成する
    const tokenEndpoint =
      `${cfg.iss}/protocol/openid-connect/token`

    logger.debug('Token endpoint: ', tokenEndpoint)

    // Client Credentials Grant用パラメーターを設定する
    const params = new URLSearchParams()

    params.append(
      'grant_type',
      'client_credentials'
    )
    params.append('client_id', cfg.clientID)
    params.append(
      'client_secret',
      cfg.clientSecret
    )

    // アクセストークンを取得する
    const response = await axios.post(
      tokenEndpoint,
      params,
      {
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        timeout: TIMEOUT,
      }
    )

    const { access_token: accessToken } =
      response.data

    if (!accessToken) {
      throw new Error(
        `Access token was not returned. realmName: ${realmName}, clientID: ${clientID}`
      )
    }

    logger.debug(
      'Access token retrieved successfully.'
    )

    return accessToken
  } catch (error) {
    logger.error(
      'Failed to retrieve access token: ',
      error.message
    )
    logger.error('Error stack: ', error.stack)

    throw error
  } finally {
    logger.debug(
      '**** getClientCredentialsToken end ****'
    )
  }
}
