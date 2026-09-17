
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const issuer2Service = require('./services/issuer2-service')
const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const WALLET_ID = 'Wallet IDを指定'
const HOLDER_DID = 'Holder DIDを指定'
const HOLDER_KEY_ID = null

const CLIENT_ID = 'eudiw-abca'
const REDIRECT_URI = 'openid://'

const OUTPUT_PATH = path.join(__dirname, '../output')

const OFFER_DETAILS_FILE = path.join(
  OUTPUT_PATH,
  'authorization-code-offer-details.json'
)

const CREDENTIAL_RESULT_FILE = path.join(
  OUTPUT_PATH,
  'authorization-code-credential-result.json'
)

const credentialMap = {
  Awards_jwt_vc_json: {
    credentialData: {
      credentialSubject: {
        id: HOLDER_DID,
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
        id: HOLDER_DID,
        given_name: 'Taro',
        family_name: 'Yamada',
        degree: 'Bachelor of Science',
        award: 'OpenID4VCI Test Award',
      },
    },
    selectiveDisclosure: {
      fields: {
        given_name: {
          sd: true,
        },
        family_name: {
          sd: false,
        },
        degree: {
          sd: true,
        },
        award: {
          sd: true,
        },
      },
      decoyMode: 'NONE',
      decoys: 0,
    },
  },
}

/**
 * 出力ディレクトリを作成します。
 */
const createOutputDirectory = () => {
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, {
      recursive: true,
    })
  }
}

/**
 * JSON ファイルを出力します。
 */
const writeJsonFile = (filePath, data) => {
  createOutputDirectory()

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    'utf8'
  )

  logger.debug('ファイルを出力しました。: ', filePath)
}

/**
 * JSON ファイルを読み込みます。
 */
const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ファイルが存在しません: ${filePath}`)
  }

  return JSON.parse(
    fs.readFileSync(filePath, 'utf8')
  )
}

/**
 * 標準入力から値を取得します。
 */
const inputValue = async (message) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    return await new Promise((resolve) => {
      rl.question(message, (answer) => {
        resolve(answer.trim())
      })
    })
  } finally {
    rl.close()
  }
}

/**
 * Redirect URL または Authorization Code を入力します。
 *
 * Redirect URL を入力した場合は code / state を取得します。
 * Authorization Code のみを入力した場合は code のみを返します。
 */
const inputAuthorizationResult = async () => {
  const input = await inputValue(
    'Redirect URL または Authorization Code を入力してください: '
  )

  if (!input) {
    throw new Error('Authorization Code が入力されていません。')
  }

  try {
    const url = new URL(input)

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
      throw new Error(
        'Redirect URL に Authorization Code が含まれていません。'
      )
    }

    return {
      code,
      state,
    }
  } catch (error) {
    if (
      error.message ===
      'Redirect URL に Authorization Code が含まれていません。'
    ) {
      throw error
    }

    return {
      code: input,
      state: null,
    }
  }
}

/**
 * Credential Profile を確認します。
 */
const checkCredentialProfile = async (profileId) => {
  logger.debug('Credential Profile を確認します。: ', profileId)

  const profile = await issuer2Service.getProfile(profileId)

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
 * Wallet2 で Credential Offer を解析します。
 */
const resolveCredentialOffer = async (
  walletId,
  credentialOffer
) => {
  logger.debug('Credential Offer を解析します。')

  const offerDetail =
    await wallet2Service.resolveCredentialOffer(
      walletId,
      credentialOffer
    )

  logger.debug(
    'Credential Offer 解析結果 : ',
    JSON.stringify(offerDetail, null, 2)
  )

  return offerDetail
}

/**
 * Authorization URL を生成します。
 */
const generateAuthorizationUrl = async (
  walletId,
  credentialOffer
) => {
  logger.debug('Authorization URL を生成します。')

  const authorizationResult =
    await wallet2Service.generateAuthorizationUrl(
      walletId,
      credentialOffer,
      {
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        usePkce: true,
        useScope: false,
      }
    )

  logger.debug(
    'Authorization URL 生成結果 : ',
    JSON.stringify(authorizationResult, null, 2)
  )

  return authorizationResult
}

/**
 * Credential Offer の作成・解析および
 * Authorization URL の生成を行います。
 */
const getOfferDetail = async (
  profileId,
  credentialConfig
) => {
  logger.debug('*** getOfferDetail start ***')

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

    const authorizationResult =
      await generateAuthorizationUrl(
        WALLET_ID,
        offer.credentialOffer
      )

    if (!authorizationResult.authorizationUrl) {
      throw new Error(
        `Authorization URL が取得できません: ${profileId}`
      )
    }

    if (!authorizationResult.state) {
      throw new Error(
        `state が取得できません: ${profileId}`
      )
    }

    const result = {
      profileId,
      profile,
      offer,
      offerDetail,
      authorizationResult,
    }

    logger.debug(
      'Credential Offer 処理結果 : ',
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getOfferDetail end ***')
  }
}

/**
 * Credential Offer の作成・解析を行い、
 * Authorization Code Flow の後続処理に必要な情報を保存します。
 */
const getOfferDetails = async () => {
  logger.debug('*** getOfferDetails start ***')

  try {
    const results = []

    for (const [profileId, credentialConfig] of
      Object.entries(credentialMap)) {
      const result = await getOfferDetail(
        profileId,
        credentialConfig
      )

      results.push(result)
    }

    writeJsonFile(
      OFFER_DETAILS_FILE,
      results
    )

    console.log('')
    console.log('========================================')
    console.log('Authorization URL')
    console.log('========================================')

    for (const result of results) {
      console.log('')
      console.log(`Profile ID: ${result.profileId}`)
      console.log(
        result.authorizationResult.authorizationUrl
      )
    }

    console.log('')
    console.log(
      'Authorization URL をブラウザで開き、認証を行ってください。'
    )
    console.log(
      '認証後、Redirect URL から code / state を取得してください。'
    )
    console.log('')
    console.log(
      `Offer 情報: ${OFFER_DETAILS_FILE}`
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
 * state を確認します。
 */
const validateState = (
  expectedState,
  actualState
) => {
  if (!actualState) {
    throw new Error(
      'Redirect URL から state を取得できません。'
    )
  }

  if (expectedState !== actualState) {
    throw new Error(
      `state が一致しません。expected=${expectedState}, actual=${actualState}`
    )
  }
}

/**
 * Authorization Code を使用して Credential を取得します。
 */
const receiveCredential = async (
  offerDetailResult,
  authorizationCode
) => {
  logger.debug('Credential を取得します。')

  const {
    offerDetail,
    authorizationResult,
  } = offerDetailResult

  const params = {
    code: authorizationCode,
    credentialIssuer:
      authorizationResult.credentialIssuerBaseUrl,
    credentialEndpoint:
      offerDetail.credentialEndpoint,
    credentialConfigurationId:
      authorizationResult.credentialConfigurationId,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    useDpop: false,
    did: HOLDER_DID,
  }

  if (authorizationResult.codeVerifier) {
    params.codeVerifier =
      authorizationResult.codeVerifier
  }

  if (authorizationResult.nonceEndpoint) {
    params.nonceEndpoint =
      authorizationResult.nonceEndpoint
  }

  if (HOLDER_KEY_ID) {
    params.keyId = HOLDER_KEY_ID
  }

  const receiveResult =
    await wallet2Service.receiveAuthorizedCredential(
      WALLET_ID,
      params
    )

  logger.debug(
    'Credential 取得結果 : ',
    JSON.stringify(receiveResult, null, 2)
  )

  return receiveResult
}

/**
 * Wallet2 に保存された Credential の詳細を取得します。
 */
const getCredentialDetails = async (
  walletId,
  credentialIds
) => {
  const credentials = []

  for (const credentialId of credentialIds) {
    logger.debug(
      'Credential 詳細を取得します。: ',
      credentialId
    )

    const credential =
      await wallet2Service.getCredential(
        walletId,
        credentialId
      )

    credentials.push(credential)
  }

  return credentials
}

/**
 * 1つの Credential を発行します。
 */
const requestCredential = async (
  offerDetailResult
) => {
  logger.debug('*** requestCredential start ***')

  try {
    const {
      profileId,
      offer,
      offerDetail,
      authorizationResult,
    } = offerDetailResult

    console.log('')
    console.log('========================================')
    console.log(`Profile ID: ${profileId}`)
    console.log('========================================')
    console.log('')
    console.log(
      'ブラウザ認証後の Redirect URL を入力してください。'
    )

    const authorization =
      await inputAuthorizationResult()

    validateState(
      authorizationResult.state,
      authorization.state
    )

    const receiveResult =
      await receiveCredential(
        offerDetailResult,
        authorization.code
      )

    const credentialIds =
      receiveResult.credentialIds || []

    if (credentialIds.length === 0) {
      throw new Error(
        `Credential が保存されていません: ${profileId}`
      )
    }

    const credentials =
      await getCredentialDetails(
        WALLET_ID,
        credentialIds
      )

    const result = {
      profileId,
      offer,
      offerDetail,
      credentialIds,
      credentials,
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
    logger.debug('*** requestCredential end ***')
  }
}

/**
 * 保存した Offer 情報と Authorization Code を使用して
 * Credential を発行します。
 */
const requestVC = async () => {
  logger.debug('*** requestVC start ***')

  try {
    const offerDetails =
      readJsonFile(OFFER_DETAILS_FILE)

    if (
      !Array.isArray(offerDetails) ||
      offerDetails.length === 0
    ) {
      throw new Error(
        'Credential Offer 情報が存在しません。'
      )
    }

    const results = []

    for (const offerDetailResult of offerDetails) {
      const result =
        await requestCredential(
          offerDetailResult
        )

      results.push(result)
    }

    writeJsonFile(
      CREDENTIAL_RESULT_FILE,
      results
    )

    console.log('')
    console.log('========================================')
    console.log('Credential 発行完了')
    console.log('========================================')
    console.log('')
    console.log(
      `発行結果: ${CREDENTIAL_RESULT_FILE}`
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
  const command = process.argv[2]

  try {
    switch (command) {
      case 'getOfferDetails':
        await getOfferDetails()
        break

      case 'requestVC':
        await requestVC()
        break

      default:
        console.log(
          '使用方法:'
        )
        console.log(
          '  node openid4vci-authorization-code-credential-issue.js getOfferDetails'
        )
        console.log(
          '  node openid4vci-authorization-code-credential-issue.js requestVC'
        )
        process.exitCode = 1
        break
    }
  } catch (error) {
    logger.error('処理に失敗しました。')
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    process.exitCode = 1
  }
}

main()
