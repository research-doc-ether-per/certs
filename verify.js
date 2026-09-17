const AUTH_METHOD = {
  PRE_AUTHORIZED: 'PRE_AUTHORIZED',
  AUTHORIZATION_CODE: 'AUTHORIZATION_CODE',
}

const createCredentialOffer = async (
  {
    profileId,
    authMethod,
    valueMode = 'BY_REFERENCE',
    issuerDid = null,
    issuerKey = null,
    expectedCredentialProofKeyJwk = null,
    credentialData = null,
    mapping = null,
    selectiveDisclosure = null,
    idTokenClaimsMapping = null,
    mDocNameSpacesDataMappingConfig = null,
    authorizedTransactionDataTypes = null,
    x5Chain = null,
    notifications = null,
    credentialStatus = null,
  },
  accessToken = null
) => {
  logger.debug('*** createCredentialOffer start ***')

  try {
    const params = {
      profileId,
      authMethod,
      valueMode,
    }

    const runtimeOverrides = {}

    if (issuerDid !== null) {
      runtimeOverrides.issuerDid = issuerDid
    }

    if (issuerKey !== null) {
      runtimeOverrides.issuerKey = issuerKey
    }

    if (expectedCredentialProofKeyJwk !== null) {
      runtimeOverrides.expectedCredentialProofKeyJwk =
        expectedCredentialProofKeyJwk
    }

    if (credentialData !== null) {
      runtimeOverrides.credentialData = credentialData
    }

    if (mapping !== null) {
      runtimeOverrides.mapping = mapping
    }

    if (selectiveDisclosure !== null) {
      runtimeOverrides.selectiveDisclosure = selectiveDisclosure
    }

    if (idTokenClaimsMapping !== null) {
      runtimeOverrides.idTokenClaimsMapping = idTokenClaimsMapping
    }

    if (mDocNameSpacesDataMappingConfig !== null) {
      runtimeOverrides.mDocNameSpacesDataMappingConfig =
        mDocNameSpacesDataMappingConfig
    }

    if (authorizedTransactionDataTypes !== null) {
      runtimeOverrides.authorizedTransactionDataTypes =
        authorizedTransactionDataTypes
    }

    if (x5Chain !== null) {
      runtimeOverrides.x5Chain = x5Chain
    }

    if (notifications !== null) {
      runtimeOverrides.notifications = notifications
    }

    if (credentialStatus !== null) {
      runtimeOverrides.credentialStatus = credentialStatus
    }

    if (Object.keys(runtimeOverrides).length > 0) {
      params.runtimeOverrides = runtimeOverrides
    }

    const response = await fetchService.handlePost(
      fetchService.issuerApi2,
      '/issuer2/credential-offers',
      accessToken,
      params
    )

    return response.data || {}
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** createCredentialOffer end ***')
  }
}
