
/**
 * OpenID4VP の Presentation Request を解析する
 *
 * @param {string} walletId Wallet ID
 * @param {string} requestUrl OpenID4VP Request URL
 * @param {string|null} accessToken Access Token
 * @returns {Promise<Object>} ResolveVpRequestResult
 */
const resolvePresentationRequest = async (
  walletId,
  requestUrl,
  accessToken = null
) => {
  logger.debug('*** resolvePresentationRequest start ***')

  try {
    const params = {
      requestUrl,
    }

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/present/resolve-request`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ')
    logger.debug(JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** resolvePresentationRequest end ***')
  }
}

/**
 * DCQL Query に一致する Credential を Wallet 内から検索する
 *
 * @param {string} walletId Wallet ID
 * @param {Object} dcqlQuery DCQL Query
 * @param {string|null} accessToken Access Token
 * @returns {Promise<Object>} MatchCredentialsResult
 */
const matchPresentationCredentials = async (
  walletId,
  dcqlQuery,
  accessToken = null
) => {
  logger.debug('*** matchPresentationCredentials start ***')

  try {
    const params = {
      dcqlQuery,
    }

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/present/match-credentials-from-store`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ')
    logger.debug(JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** matchPresentationCredentials end ***')
  }
}

/**
 * 選択した Credential から VP Token を生成する
 *
 * @param {string} walletId Wallet ID
 * @param {Object} options VP Token 生成パラメータ
 * @param {string} options.requestUrl OpenID4VP Request URL
 * @param {Array<Object>} options.selectedCredentialOptions 選択した Credential
 * @param {Array<Object>|null} options.selectedDisclosureOptions 選択した Disclosure
 * @param {string|null} options.keyId Holder Key ID
 * @param {string|null} options.did Holder DID
 * @param {string|null} accessToken Access Token
 * @returns {Promise<Object>} BuildVpTokenResult
 */
const buildVpToken = async (
  walletId,
  {
    requestUrl,
    selectedCredentialOptions,
    selectedDisclosureOptions = null,
    keyId = null,
    did = null,
  },
  accessToken = null
) => {
  logger.debug('*** buildVpToken start ***')

  try {
    const params = {
      requestUrl,
      selectedCredentialOptions,
    }

    if (selectedDisclosureOptions) {
      params.selectedDisclosureOptions = selectedDisclosureOptions
    }

    if (keyId) {
      params.keyId = keyId
    }

    if (did) {
      params.did = did
    }

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/present/build-vp-token`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ')
    logger.debug(JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** buildVpToken end ***')
  }
}

/**
 * VP Token を Verifier に送信する
 *
 * @param {string} walletId Wallet ID
 * @param {Object} options Presentation Response パラメータ
 * @param {string} options.requestUrl OpenID4VP Request URL
 * @param {string} options.vpToken VP Token
 * @param {string|null} options.idToken ID Token
 * @param {string|null} accessToken Access Token
 * @returns {Promise<Object>} WalletPresentResult
 */
const sendPresentationResponse = async (
  walletId,
  {
    requestUrl,
    vpToken,
    idToken = null,
  },
  accessToken = null
) => {
  logger.debug('*** sendPresentationResponse start ***')

  try {
    const params = {
      requestUrl,
      vpToken,
    }

    if (idToken) {
      params.idToken = idToken
    }

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/present/send-response`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ')
    logger.debug(JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** sendPresentationResponse end ***')
  }
}
