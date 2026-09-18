const fs = require('fs')
const path = require('path')
const issuer2Service = require('./services/issuer2-service')
const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const WALLET_ID = 'Wallet IDを指定'
const HOLDER_DID = 'Holder DIDを指定'
const HOLDER_KEY_ID = 'Holder Key IDを指定'

const CLIENT_ID = 'wallet-web'
const REDIRECT_URI = 'http://10.0.2.15:6101'

const OUTPUT_PATH = path.join(
  __dirname,
  '../output/authorization-code-step-by-step-details.json'
)

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
 * Authorization Code Flow 用の Credential Offer を作成します。
 */
const createCredentialOffer = async (
  profileId,
  credentialConfig
) => {
  logger.debug('Credential Offer を作成します。: ', profileId)

  const params = {
    profileId,
    authMethod:
      issuer2Service.AUTH_METHOD.AUTHORIZATION_CODE,
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
 * Authorization URL を生成します。
 */
const generateAuthorizationUrl = async (
  walletId,
  credentialOffer
) => {
  logger.debug('Authorization URL を生成します。')

  const result =
    await wallet2Service.generateAuthorizationUrl(
      walletId,
      {
        offerUrl: credentialOffer,
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        usePkce: true,
        useScope: false,
      }
    )

  logger.debug(
    'Authorization URL 生成結果 : ',
    JSON.stringify(result, null, 2)
  )

  return result
}

/**
 * Authorization Code を Access Token に交換します。
 */
const exchangeAuthorizationCode = async (
  walletId,
  details
) => {
  logger.debug('Authorization Code を Access Token に交換します。')

  const callback = details.callback
  const authorizationResult = details.authorizationResult

  if (!callback?.code) {
    throw new Error(
      'Authorization Code が設定されていません。'
    )
  }

  if (!callback?.state) {
    throw new Error(
      'Callback の state が設定されていません。'
    )
  }

  if (
    callback.state !==
    authorizationResult.state
  ) {
    throw new Error(
      'Callback の state が一致しません。'
    )
  }

  const result =
    await wallet2Service.exchangeAuthorizationCode(
      walletId,
      {
        code:
          callback.code,

        credentialIssuerBaseUrl:
          authorizationResult.credentialIssuerBaseUrl,

        codeVerifier:
          authorizationResult.codeVerifier,

        clientId:
          CLIENT_ID,

        redirectUri:
          REDIRECT_URI,
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

        clientId:
          CLIENT_ID,

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
 * Authorization Code Flow の継続情報を保存します。
 */
const saveDetails = (details) => {
  const outputDir = path.dirname(OUTPUT_PATH)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(
      outputDir,
      {
        recursive: true,
      }
    )
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(details, null, 2),
    'utf8'
  )

  logger.debug(
    '継続情報を保存しました。: ',
    OUTPUT_PATH
  )
}

/**
 * Authorization Code Flow の継続情報を読み込みます。
 */
const loadDetails = () => {
  if (!fs.existsSync(OUTPUT_PATH)) {
    throw new Error(
      `継続情報ファイルが存在しません: ${OUTPUT_PATH}`
    )
  }

  return JSON.parse(
    fs.readFileSync(
      OUTPUT_PATH,
      'utf8'
    )
  )
}

/**
 * Credential Offer を作成し、
 * Authorization URL を取得します。
 */
const getOfferDetails = async () => {
  logger.debug('*** getOfferDetails start ***')

  try {
    const profileIds =
      Object.keys(credentialMap)

    if (profileIds.length !== 1) {
      throw new Error(
        'Authorization Code Flow の確認では、credentialMap に Credential Profile を1件だけ指定してください。'
      )
    }

    const profileId =
      profileIds[0]

    const credentialConfig =
      credentialMap[profileId]

    const profile =
      await checkCredentialProfile(
        profileId
      )

    const offer =
      await createCredentialOffer(
        profileId,
        credentialConfig
      )

    if (!offer.credentialOffer) {
      throw new Error(
        'credentialOffer が取得できません。'
      )
    }

    const offerDetail =
      await resolveCredentialOffer(
        WALLET_ID,
        offer.credentialOffer
      )

    const authorizationResult =
      await generateAuthorizationUrl(
        WALLET_ID,
        offer.credentialOffer
      )

    const details = {
      profileId,
      profile,
      offer,
      offerDetail,
      authorizationResult,

      callback: {
        code: '',
        state: '',
      },
    }

    saveDetails(details)

    logger.debug('')
    logger.debug(
      '以下の Authorization URL をブラウザで開いて認証してください。'
    )
    logger.debug(
      authorizationResult.authorizationUrl
    )
    logger.debug('')
    logger.debug(
      '認証完了後、Callback で取得した code と state を以下のファイルに設定してください。'
    )
    logger.debug(
      OUTPUT_PATH
    )
    logger.debug('')
    logger.debug(
      '"callback": {'
    )
    logger.debug(
      '  "code": "Callback で取得した code",'
    )
    logger.debug(
      '  "state": "Callback で取得した state"'
    )
    logger.debug(
      '}'
    )
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getOfferDetails end ***')
  }
}

/**
 * Authorization Code を使用して
 * Credential を取得します。
 */
const requestVC = async () => {
  logger.debug('*** requestVC start ***')

  try {
    const details =
      loadDetails()

    if (!details.callback?.code) {
      throw new Error(
        'Callback の code を設定してください。'
      )
    }

    if (!details.callback?.state) {
      throw new Error(
        'Callback の state を設定してください。'
      )
    }

    if (
      details.callback.state !==
      details.authorizationResult.state
    ) {
      throw new Error(
        'Callback の state が Authorization Request の state と一致しません。'
      )
    }

    logger.debug(
      'Callback の state を確認しました。'
    )

    const tokenResult =
      await exchangeAuthorizationCode(
        WALLET_ID,
        details
      )

    const nonceResult =
      await requestNonce(
        WALLET_ID,
        details.offerDetail
      )

    const proofResult =
      await signProof(
        WALLET_ID,
        details.offerDetail,
        nonceResult
      )

    const credentialResult =
      await fetchCredential(
        WALLET_ID,
        details.offerDetail,
        tokenResult,
        proofResult
      )

    const result = {
      ...details,
      tokenResult,
      nonceResult,
      proofResult,
      credentialResult,
    }

    saveDetails(result)

    logger.debug(
      'Credential 発行結果 : ',
      JSON.stringify(result, null, 2)
    )
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** requestVC end ***')
  }
}

/**
 * Main
 */
const main = async () => {
  logger.debug('*** main start ***')

  try {
    const command =
      process.argv[2]

    switch (command) {
      case 'getOfferDetails':
        await getOfferDetails()
        break

      case 'requestVC':
        await requestVC()
        break

      default:
        logger.debug(
          '以下のいずれかを指定してください。'
        )
        logger.debug(
          'getOfferDetails'
        )
        logger.debug(
          'requestVC'
        )
        process.exitCode = 1
        break
    }
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




/**
 * Authorization Code を Access Token に交換します。
 */
const exchangeAuthorizationCode = async (
  walletId,
  {
    code,
    credentialIssuerBaseUrl,
    codeVerifier = null,
    clientId = 'eudiw-abca',
    redirectUri = 'openid://',
    tokenRequestHeaders = {},
  },
  accessToken = null
) => {
  logger.debug('*** exchangeAuthorizationCode start ***')

  try {
    const params = {
      code,
      credentialIssuerBaseUrl,
      clientId,
      redirectUri,
      tokenRequestHeaders,
    }

    if (codeVerifier) {
      params.codeVerifier =
        codeVerifier
    }

    logger.debug('params : ', params)

    const response = await fetchService.handlePost(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/receive/exchange-code`,
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
    logger.debug('*** exchangeAuthorizationCode end ***')
  }
}
