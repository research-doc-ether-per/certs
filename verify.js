/**
 * Pre-Authorized Code を Access Token に交換します。
 */
const requestCredentialToken = async (
  walletId,
  {
    tokenEndpoint,
    preAuthorizedCode,
    credentialIssuer = null,
    txCode = null,
    clientId = 'eudiw-abca',
    redirectUri = 'openid://',
    tokenRequestHeaders = {},
    anonymousPreAuthorizedCode = false,
  },
  accessToken = null
) => {
  logger.debug('*** requestCredentialToken start ***')

  try {
    const params = {
      tokenEndpoint,
      preAuthorizedCode,
      clientId,
      redirectUri,
      tokenRequestHeaders,
      anonymousPreAuthorizedCode,
    }

    if (credentialIssuer) {
      params.credentialIssuer = credentialIssuer
    }

    if (txCode) {
      params.txCode = txCode
    }

    logger.debug('params : ', params)

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive/request-token`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** requestCredentialToken end ***')
  }
}

/**
 * Credential Proof 用の Nonce を取得します。
 */
const requestCredentialNonce = async (
  walletId,
  credentialIssuer,
  accessToken = null
) => {
  logger.debug('*** requestCredentialNonce start ***')

  try {
    const params = {
      credentialIssuer,
    }

    logger.debug('params : ', params)

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive/request-nonce`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** requestCredentialNonce end ***')
  }
}

/**
 * Credential Proof を生成します。
 */
const signCredentialProof = async (
  walletId,
  {
    issuerUrl,
    credentialConfigurationId,
    nonce = null,
    keyId = null,
    did = null,
  },
  accessToken = null
) => {
  logger.debug('*** signCredentialProof start ***')

  try {
    const params = {
      issuerUrl,
      credentialConfigurationId,
    }

    if (nonce) {
      params.nonce = nonce
    }

    if (keyId) {
      params.keyId = keyId
    }

    if (did) {
      params.did = did
    }

    logger.debug('params : ', params)

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive/sign-proof`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** signCredentialProof end ***')
  }
}

/**
 * Issuer から Credential を取得します。
 */
const fetchCredential = async (
  walletId,
  {
    credentialEndpoint,
    credentialAccessToken,
    credentialConfigurationId,
    proofJwt = null,
    clientId = 'eudiw-abca',
    storeInWallet = true,
    credentialIssuerBaseUrl = null,
    metadata = null,
    label = null,
  },
  accessToken = null
) => {
  logger.debug('*** fetchCredential start ***')

  try {
    const params = {
      credentialEndpoint,
      accessToken: credentialAccessToken,
      credentialConfigurationId,
      clientId,
      storeInWallet,
    }

    if (proofJwt) {
      params.proofJwt = proofJwt
    }

    if (credentialIssuerBaseUrl) {
      params.credentialIssuerBaseUrl =
        credentialIssuerBaseUrl
    }

    if (metadata) {
      params.metadata = metadata
    }

    if (label) {
      params.label = label
    }

    logger.debug('params : ', params)

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive/fetch-credential`,
      accessToken,
      params
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** fetchCredential end ***')
  }
}


const issuer2Service = require('./services/issuer2-service')
const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const WALLET_ID = 'Wallet IDを指定'
const HOLDER_DID = 'Holder DIDを指定'
const HOLDER_KEY_ID = 'Holder Key IDを指定'

const credentialMap = {
  Awards_jwt_vc_json: {
    credentialData: {
      credentialSubject: {
        given_name: 'Taro',
        family_name: 'Yamada',
        degree: 'Bachelor of Science',
        award: 'OpenID4VCI Test Award',
      },
    },
  },

  Awards: {
    credentialData: {
      credentialSubject: {
        given_name: 'Taro',
        family_name: 'Yamada',
        degree: 'Bachelor of Science',
        award: 'OpenID4VCI Test Award',
      },
    },
  },
}

/**
 * Credential Profile を確認します。
 */
const checkCredentialProfile = async (profileId) => {
  logger.debug('Credential Profile を確認します。: ', profileId)

  const profile =
    await issuer2Service.getProfile(profileId)

  if (!profile) {
    throw new Error(
      `Credential Profile が存在しません: ${profileId}`
    )
  }

  logger.debug(
    'Credential Profile : ',
    JSON.stringify(profile, null, 2)
  )

  return profile
}

/**
 * Pre-Authorized Code Flow 用の Credential Offer を作成します。
 */
const createCredentialOffer = async (
  profileId,
  credentialConfig
) => {
  logger.debug('Credential Offer を作成します。: ', profileId)

  const params = {
    profileId,
    authMethod:
      issuer2Service.AUTH_METHOD.PRE_AUTHORIZED,
    valueMode: 'BY_REFERENCE',
  }

  if (credentialConfig.credentialData) {
    params.credentialData =
      credentialConfig.credentialData
  }

  if (credentialConfig.selectiveDisclosure) {
    params.selectiveDisclosure =
      credentialConfig.selectiveDisclosure
  }

  if (credentialConfig.issuerDid) {
    params.issuerDid =
      credentialConfig.issuerDid
  }

  if (credentialConfig.issuerKey) {
    params.issuerKey =
      credentialConfig.issuerKey
  }

  if (credentialConfig.mapping) {
    params.mapping =
      credentialConfig.mapping
  }

  if (credentialConfig.x5Chain) {
    params.x5Chain =
      credentialConfig.x5Chain
  }

  const offer =
    await issuer2Service.createCredentialOffer(params)

  logger.debug(
    'Credential Offer : ',
    JSON.stringify(offer, null, 2)
  )

  return offer
}

/**
 * Credential Offer を解析します。
 */
const resolveCredentialOffer = async (
  walletId,
  credentialOffer
) => {
  logger.debug('Credential Offer を解析します。')

  const result =
    await wallet2Service.resolveCredentialOffer(
      walletId,
      credentialOffer
    )

  logger.debug(
    'Credential Offer 解析結果 : ',
    JSON.stringify(result, null, 2)
  )

  return result
}

/**
 * Pre-Authorized Code を使用して Access Token を取得します。
 */
const requestToken = async (
  walletId,
  offerDetail
) => {
  logger.debug('Access Token を取得します。')

  if (!offerDetail.tokenEndpoint) {
    throw new Error(
      'tokenEndpoint が取得できません。'
    )
  }

  if (!offerDetail.preAuthorizedCode) {
    throw new Error(
      'preAuthorizedCode が取得できません。'
    )
  }

  const result =
    await wallet2Service.requestCredentialToken(
      walletId,
      {
        tokenEndpoint:
          offerDetail.tokenEndpoint,

        preAuthorizedCode:
          offerDetail.preAuthorizedCode,

        credentialIssuer:
          offerDetail.credentialIssuer,
      }
    )

  logger.debug(
    'Token 取得結果 : ',
    JSON.stringify(result, null, 2)
  )

  return result
}

/**
 * Credential Proof 用の Nonce を取得します。
 */
const requestNonce = async (
  walletId,
  offerDetail
) => {
  logger.debug('Nonce を取得します。')

  if (!offerDetail.credentialIssuer) {
    throw new Error(
      'credentialIssuer が取得できません。'
    )
  }

  const result =
    await wallet2Service.requestCredentialNonce(
      walletId,
      offerDetail.credentialIssuer
    )

  logger.debug(
    'Nonce 取得結果 : ',
    JSON.stringify(result, null, 2)
  )

  return result
}

/**
 * Holder Key と Holder DID を使用して
 * Credential Proof を生成します。
 */
const signProof = async (
  walletId,
  offerDetail,
  nonceResult
) => {
  logger.debug('Credential Proof を生成します。')

  const credentialConfigurationId =
    offerDetail.credentialConfigurationIds?.[0]

  if (!credentialConfigurationId) {
    throw new Error(
      'credentialConfigurationId が取得できません。'
    )
  }

  if (!offerDetail.credentialIssuer) {
    throw new Error(
      'credentialIssuer が取得できません。'
    )
  }

  const result =
    await wallet2Service.signCredentialProof(
      walletId,
      {
        issuerUrl:
          offerDetail.credentialIssuer,

        credentialConfigurationId,

        nonce:
          nonceResult.nonce,

        keyId:
          HOLDER_KEY_ID,

        did:
          HOLDER_DID,
      }
    )

  logger.debug(
    'Credential Proof 生成結果 : ',
    JSON.stringify(result, null, 2)
  )

  return result
}

/**
 * Access Token と Credential Proof を使用して
 * Credential を取得し、Wallet2 に保存します。
 */
const fetchCredential = async (
  walletId,
  offerDetail,
  tokenResult,
  proofResult
) => {
  logger.debug('Credential を取得します。')

  const credentialConfigurationId =
    offerDetail.credentialConfigurationIds?.[0]

  if (!credentialConfigurationId) {
    throw new Error(
      'credentialConfigurationId が取得できません。'
    )
  }

  if (!offerDetail.credentialEndpoint) {
    throw new Error(
      'credentialEndpoint が取得できません。'
    )
  }

  if (!tokenResult.accessToken) {
    throw new Error(
      'accessToken が取得できません。'
    )
  }

  if (!proofResult.proofJwt) {
    throw new Error(
      'proofJwt が取得できません。'
    )
  }

  const result =
    await wallet2Service.fetchCredential(
      walletId,
      {
        credentialEndpoint:
          offerDetail.credentialEndpoint,

        credentialAccessToken:
          tokenResult.accessToken,

        credentialConfigurationId,

        proofJwt:
          proofResult.proofJwt,

        storeInWallet:
          true,

        credentialIssuerBaseUrl:
          offerDetail.credentialIssuer,
      }
    )

  logger.debug(
    'Credential 取得結果 : ',
    JSON.stringify(result, null, 2)
  )

  return result
}

/**
 * Credential を発行します。
 */
const issueCredential = async (
  profileId,
  credentialConfig
) => {
  logger.debug('*** issueCredential start ***')

  try {
    const profile =
      await checkCredentialProfile(profileId)

    const offer =
      await createCredentialOffer(
        profileId,
        credentialConfig
      )

    if (!offer.credentialOffer) {
      throw new Error(
        `credentialOffer が取得できません: ${profileId}`
      )
    }

    const offerDetail =
      await resolveCredentialOffer(
        WALLET_ID,
        offer.credentialOffer
      )

    const tokenResult =
      await requestToken(
        WALLET_ID,
        offerDetail
      )

    const nonceResult =
      await requestNonce(
        WALLET_ID,
        offerDetail
      )

    const proofResult =
      await signProof(
        WALLET_ID,
        offerDetail,
        nonceResult
      )

    const credentialResult =
      await fetchCredential(
        WALLET_ID,
        offerDetail,
        tokenResult,
        proofResult
      )

    const result = {
      profileId,
      profile,
      offer,
      offerDetail,
      tokenResult,
      nonceResult,
      proofResult,
      credentialResult,
    }

    logger.debug(
      'Credential 発行結果 : ',
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** issueCredential end ***')
  }
}

/**
 * Main
 */
const main = async () => {
  logger.debug('*** main start ***')

  try {
    const results = []

    for (const [profileId, credentialConfig] of
      Object.entries(credentialMap)) {
      logger.debug(
        'Credential 発行処理を開始します。: ',
        profileId
      )

      const result =
        await issueCredential(
          profileId,
          credentialConfig
        )

      results.push(result)
    }

    logger.debug(
      '処理結果 : ',
      JSON.stringify(results, null, 2)
    )
  } catch (error) {
    logger.error('処理に失敗しました。')
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    process.exitCode = 1
  } finally {
    logger.debug('*** main end ***')
  }
}

main()
