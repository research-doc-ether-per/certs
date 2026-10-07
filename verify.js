
const log4js = require('log4js')
const path = require('path')
const fs = require('fs')

const issuer2Service = require('./services/issuer2-service')
const wallet2Service = require('./services/wallet2-service')
const vcStatusService = require('./services/vc-status-service')

let log4jsConfig = require('../config/log4js.json')

const fileName =
  'openid4vci-authorization-code-credential-issue'

log4jsConfig.appenders.file.filename =
  `./logs/${fileName}.log`

log4js.configure(log4jsConfig)

const logger = log4js.getLogger(fileName)


// ============================================================
// 出力ファイル
// ============================================================

const OUTPUT_PATH =
  path.join(__dirname, '../output')

const OFFER_DETAILS_FILE =
  path.join(
    OUTPUT_PATH,
    'authorization-code-offer-details.json'
  )

const CREDENTIAL_RESULT_FILE =
  path.join(
    OUTPUT_PATH,
    'authorization-code-credential-result.json'
  )


wallet2Service.setLogger(logger)
issuer2Service.setLogger(logger)
vcStatusService.setLogger(logger)


// ============================================================
// 設定
// ============================================================

// Credential 発行データ
const credentialOfferData =
  require('../input-datas/offer-data.json')

// Wallet 情報
const walletInfo =
  require('../input-datas/wallet-info.json')


// 同一 Credential Offer を複数の Holder で利用可能にするか。
const multipleUseAllowed = true


const CLIENT_ID = 'wallet-web'

const REDIRECT_URI =
  'http://10.0.2.15:6101/individual'


/**
 * 発行対象 Credential
 *
 * key   : profileId
 * value : offer-data.json の config key
 */
const credentialMap = [
  [
    'awardsJwt',
    'awardsJwtVerificationTrue'
  ],

  // [
  //   'awardsJwt',
  //   'awardsJwtVerificationFalse'
  // ],

  // [
  //   'awardsSdJwt',
  //   'awardsSdJwtVerificationTrue'
  // ],

  // [
  //   'careerJwt',
  //   'careerJwtVerificationTrue'
  // ],

  // [
  //   'qualificationsJwt',
  //   'qualificationsJwtVerificationTrue'
  // ],
]


const WALLET_ID =
  walletInfo.walletId

const HOLDER_DID =
  walletInfo.defaultDidId

const HOLDER_DIDS =
  walletInfo.dids || []


// ============================================================
// 共通処理
// ============================================================

const createOutputDirectory = () => {
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(
      OUTPUT_PATH,
      {
        recursive: true
      }
    )
  }
}


const writeJsonFile = (
  filePath,
  data
) => {
  createOutputDirectory()

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    ),
    'utf8'
  )

  logger.debug(
    'ファイルを出力しました。: ',
    filePath
  )
}


const readJsonFile = filePath => {

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `ファイルが存在しません: ${filePath}`
    )
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      'utf8'
    )
  )
}


// ============================================================
// Credential Profile
// ============================================================

const checkCredentialProfile =
  async profileId => {

    logger.debug(
      'Credential Profile を確認します。: ',
      profileId
    )

    const profile =
      await issuer2Service.getProfile(
        profileId
      )

    if (!profile) {
      throw new Error(
        `Credential Profile が存在しません: ${profileId}`
      )
    }

    logger.debug(
      'Credential Profile : ',
      JSON.stringify(
        profile,
        null,
        2
      )
    )

    return profile
  }


// ============================================================
// Credential Offer
// ============================================================

const createCredentialOffer =
  async (
    profileId,
    config
  ) => {

    logger.debug(
      'Credential Offer を作成します。: ',
      profileId
    )

    const offer =
      await issuer2Service.createCredentialOffer({

        profileId,

        authMethod:
          issuer2Service
            .AUTH_METHOD
            .AUTHORIZATION_CODE,

        valueMode:
          'BY_REFERENCE',

        /**
         * 複数 Holder で利用する場合は、
         * issuer_state を Credential Offer に含めない。
         */
        issuerStateMode:
          multipleUseAllowed
            ? 'OMIT'
            : 'INCLUDE',

        credentialData:
          config.credentialData
          ?? null,

        selectiveDisclosure:
          config.selectiveDisclosure
          ?? null,

        issuerDid:
          config.issuerDid
          ?? null,

        issuerKey:
          config.issuerKey
          ?? null,

        mapping:
          config.mapping
          ?? null,

        idTokenClaimsMapping:
          config.idTokenClaimsMapping
          ?? null,

        x5Chain:
          config.x5Chain
          ?? null,
      })


    if (
      !offer
      ||
      !offer.credentialOffer
    ) {
      throw new Error(
        `Credential Offer の作成に失敗しました: ${profileId}`
      )
    }


    logger.debug(
      'Credential Offer : ',
      JSON.stringify(
        offer,
        null,
        2
      )
    )

    return offer
  }


// ============================================================
// Credential Offer 解析
// ============================================================

const resolveCredentialOffer =
  async (
    walletId,
    credentialOffer
  ) => {

    logger.debug(
      'Credential Offer を解析します。'
    )

    const offerDetail =
      await wallet2Service
        .resolveCredentialOffer(
          walletId,
          credentialOffer
        )


    logger.debug(
      'Credential Offer 解析結果 : ',
      JSON.stringify(
        offerDetail,
        null,
        2
      )
    )

    return offerDetail
  }


// ============================================================
// Authorization URL
// ============================================================

const generateAuthorizationUrl =
  async (
    walletId,
    credentialOffer
  ) => {

    logger.debug(
      'Authorization URL を生成します。'
    )


    const authorizationResult =
      await wallet2Service
        .generateAuthorizationUrl(
          walletId,
          credentialOffer,
          {
            clientId:
              CLIENT_ID,

            redirectUri:
              REDIRECT_URI,

            usePkce:
              true,

            useScope:
              false,
          }
        )


    logger.debug(
      'Authorization URL 生成結果 : ',
      JSON.stringify(
        authorizationResult,
        null,
        2
      )
    )


    return authorizationResult
  }


// ============================================================
// Holder DID
// ============================================================

const getTargetHolderDids = () => {

  /**
   * 一対一
   */
  if (!multipleUseAllowed) {

    if (!HOLDER_DID) {
      throw new Error(
        'defaultDidId が設定されていません。'
      )
    }

    return [
      HOLDER_DID
    ]
  }


  /**
   * 一対多
   */
  const holderDids =
    HOLDER_DIDS
      .map(item => {

        if (
          typeof item === 'string'
        ) {
          return item
        }

        return item?.did
      })
      .filter(Boolean)


  if (
    holderDids.length === 0
  ) {
    throw new Error(
      'Holder DID が設定されていません。'
    )
  }

  return holderDids
}


// ============================================================
// Offer + Authorization URL 作成
// ============================================================

const getOfferDetail =
  async (
    profileId,
    credentialConfig
  ) => {

    logger.debug(
      '**** getOfferDetail start ****'
    )

    try {

      // ------------------------------
      // Profile
      // ------------------------------

      const profile =
        await checkCredentialProfile(
          profileId
        )


      // ------------------------------
      // Credential Offer
      //
      // 同一 Offer を1回だけ作成する
      // ------------------------------

      const offer =
        await createCredentialOffer(
          profileId,
          credentialConfig
        )


      // ------------------------------
      // BSL
      // ------------------------------

      await vcStatusService
        .createBSL(
          profile.name,
          profile.issuerDid
        )


      // ------------------------------
      // Offer Detail
      //
      // Offer 自体は同じなので1回だけ解析
      // ------------------------------

      const offerDetail =
        await resolveCredentialOffer(
          WALLET_ID,
          offer.credentialOffer
        )


      // ------------------------------
      // Holder
      // ------------------------------

      const holderDids =
        getTargetHolderDids()

      const holderFlows = []


      // ------------------------------
      // Holder ごとに
      // Authorization URL を生成
      // ------------------------------

      for (
        const holderDid
        of holderDids
      ) {

        logger.debug('')
        logger.debug(
          '========================================'
        )

        logger.debug(
          `Holder DID: ${holderDid}`
        )

        logger.debug(
          '========================================'
        )


        const authorizationResult =
          await generateAuthorizationUrl(
            WALLET_ID,
            offer.credentialOffer
          )


        if (
          !authorizationResult
            .authorizationUrl
        ) {
          throw new Error(
            `Authorization URL が取得できません: ${holderDid}`
          )
        }


        if (
          !authorizationResult.state
        ) {
          throw new Error(
            `state が取得できません: ${holderDid}`
          )
        }


        /**
         * Authorization URL と
         * Holder DID を紐づけて保存する。
         *
         * redirectUrl は
         * ブラウザ認証後に手動で設定する。
         */
        holderFlows.push({

          holderDid,

          authorizationResult,

          redirectUrl:
            null,
        })
      }


      const result = {

        profileId,

        profile,

        offer,

        offerDetail,

        holderFlows,
      }


      logger.debug(
        'Credential Offer 処理結果 : ',
        JSON.stringify(
          result,
          null,
          2
        )
      )


      return result

    } catch (error) {

      logger.error(
        'error.message: ',
        error.message
      )

      logger.error(
        'error.stack: ',
        error.stack
      )

      throw error

    } finally {

      logger.debug(
        '**** getOfferDetail end ****'
      )
    }
  }


// ============================================================
// Offer 情報をファイルに保存
// ============================================================

const getOfferDetails =
  async () => {

    logger.debug(
      '**** getOfferDetails start ****'
    )

    try {

      const results = []


      for (
        const [
          profileId,
          configId
        ]
        of credentialMap
      ) {

        logger.debug('')
        logger.debug(
          'Credential 発行準備を開始します。'
        )

        logger.debug(
          `profileId: ${profileId}`
        )

        logger.debug(
          `configId: ${configId}`
        )


        const config =
          credentialOfferData
            ?.[configId]


        if (!config) {

          logger.debug(
            `Credential 設定が存在しないためスキップします: ${configId}`
          )

          continue
        }


        const result =
          await getOfferDetail(
            profileId,
            config
          )


        results.push(
          result
        )
      }


      // ------------------------------
      // JSON 保存
      // ------------------------------

      writeJsonFile(
        OFFER_DETAILS_FILE,
        results
      )


      // ------------------------------
      // Authorization URL 表示
      // ------------------------------

      logger.debug('')
      logger.debug(
        '========================================'
      )

      logger.debug(
        'Authorization URL'
      )

      logger.debug(
        '========================================'
      )


      for (
        const result
        of results
      ) {

        logger.debug('')
        logger.debug(
          `Profile ID: ${result.profileId}`
        )


        for (
          const holderFlow
          of result.holderFlows
        ) {

          logger.debug('')

          logger.debug(
            `Holder DID: ${holderFlow.holderDid}`
          )

          logger.debug(
            holderFlow
              .authorizationResult
              .authorizationUrl
          )
        }
      }


      logger.debug('')
      logger.debug(
        '各 Authorization URL をブラウザで開いて認証してください。'
      )

      logger.debug(
        '認証後の Redirect URL を JSON の redirectUrl に設定してください。'
      )

      logger.debug(
        `Offer 情報: ${OFFER_DETAILS_FILE}`
      )

    } catch (error) {

      logger.error(
        'error.message: ',
        error.message
      )

      logger.error(
        'error.stack: ',
        error.stack
      )

      throw error

    } finally {

      logger.debug(
        '**** getOfferDetails end ****'
      )
    }
  }


// ============================================================
// Redirect URL 解析
// ============================================================

const parseAuthorizationResult =
  redirectUrl => {

    if (!redirectUrl) {
      throw new Error(
        'Redirect URL が設定されていません。'
      )
    }


    let url


    try {

      url =
        new URL(
          redirectUrl
        )

    } catch (error) {

      throw new Error(
        `Redirect URL の形式が正しくありません: ${redirectUrl}`
      )
    }


    const code =
      url
        .searchParams
        .get('code')


    const state =
      url
        .searchParams
        .get('state')


    if (!code) {
      throw new Error(
        'Redirect URL に Authorization Code が含まれていません。'
      )
    }


    if (!state) {
      throw new Error(
        'Redirect URL に state が含まれていません。'
      )
    }


    return {
      code,
      state,
    }
  }


// ============================================================
// state 確認
// ============================================================

const validateState =
  (
    expectedState,
    actualState
  ) => {

    if (!actualState) {

      throw new Error(
        'Redirect URL から state を取得できません。'
      )
    }


    if (
      expectedState
      !==
      actualState
    ) {

      throw new Error(
        `state が一致しません。expected=${expectedState}, actual=${actualState}`
      )
    }
  }


// ============================================================
// Credential 取得
// ============================================================

const receiveCredential =
  async (
    offerDetailResult,
    holderFlow,
    authorizationCode
  ) => {

    logger.debug(
      'Credential を取得します。'
    )


    const {
      offerDetail
    } =
      offerDetailResult


    const {
      holderDid,
      authorizationResult,
    } =
      holderFlow


    const params = {

      code:
        authorizationCode,

      credentialIssuer:
        authorizationResult
          .credentialIssuerBaseUrl,

      credentialEndpoint:
        offerDetail
          .credentialEndpoint,

      credentialConfigurationId:
        authorizationResult
          .credentialConfigurationId,

      clientId:
        CLIENT_ID,

      redirectUri:
        REDIRECT_URI,

      useDPoP:
        false,

      /**
       * Holder ごとに
       * DID を指定する。
       */
      did:
        holderDid,
    }


    /**
     * PKCE
     */
    if (
      authorizationResult
        .codeVerifier
    ) {

      params.codeVerifier =
        authorizationResult
          .codeVerifier
    }


    /**
     * Nonce Endpoint
     */
    if (
      authorizationResult
        .nonceEndpoint
    ) {

      params.nonceEndpoint =
        authorizationResult
          .nonceEndpoint
    }


    const receiveResult =
      await wallet2Service
        .receiveAuthorizedCredential(
          WALLET_ID,
          params
        )


    logger.debug(
      'Credential 取得結果 : ',
      JSON.stringify(
        receiveResult,
        null,
        2
      )
    )


    return receiveResult
  }


// ============================================================
// Credential 詳細
// ============================================================

const getCredentialDetails =
  async (
    walletId,
    credentialIds
  ) => {

    const credentials = []


    for (
      const credentialId
      of credentialIds
    ) {

      logger.debug(
        'Credential 詳細を取得します。: ',
        credentialId
      )


      const credential =
        await wallet2Service
          .getCredential({
            walletId,
            credentialId,
          })


      credentials.push(
        credential
      )
    }


    return credentials
  }


// ============================================================
// Credential 発行
// ============================================================

const requestCredential =
  async (
    offerDetailResult
  ) => {

    logger.debug(
      '**** requestCredential start ****'
    )

    try {

      const {
        profileId,
        offer,
        offerDetail,
        holderFlows,
      } =
        offerDetailResult


      if (
        !Array.isArray(
          holderFlows
        )
        ||
        holderFlows.length === 0
      ) {

        throw new Error(
          `Holder 情報が存在しません: ${profileId}`
        )
      }


      const holderResults = []


      // ------------------------------
      // Holder ごとに Credential 発行
      // ------------------------------

      for (
        const holderFlow
        of holderFlows
      ) {

        const {
          holderDid,
          authorizationResult,
          redirectUrl,
        } =
          holderFlow


        logger.debug('')
        logger.debug(
          '========================================'
        )

        logger.debug(
          `Profile ID: ${profileId}`
        )

        logger.debug(
          `Holder DID: ${holderDid}`
        )

        logger.debug(
          '========================================'
        )


        // ------------------------------
        // Redirect URL
        // ------------------------------

        if (!redirectUrl) {

          throw new Error(
            `Redirect URL が設定されていません: ${holderDid}`
          )
        }


        // ------------------------------
        // code / state 取得
        // ------------------------------

        const authorization =
          parseAuthorizationResult(
            redirectUrl
          )


        // ------------------------------
        // state 検証
        // ------------------------------

        validateState(
          authorizationResult
            .state,

          authorization
            .state
        )


        // ------------------------------
        // Credential 取得
        // ------------------------------

        const receiveResult =
          await receiveCredential(
            offerDetailResult,
            holderFlow,
            authorization.code
          )


        const credentialIds =
          receiveResult
            .credentialIds
          || []


        if (
          credentialIds.length === 0
        ) {

          throw new Error(
            `Credential が保存されていません: ${holderDid}`
          )
        }


        // ------------------------------
        // Credential 詳細
        // ------------------------------

        const credentials =
          await getCredentialDetails(
            WALLET_ID,
            credentialIds
          )


        holderResults.push({

          holderDid,

          redirectUrl,

          credentialIds,

          credentials,
        })
      }


      return {

        profileId,

        offer,

        offerDetail,

        holderResults,
      }

    } catch (error) {

      logger.error(
        'error.message: ',
        error.message
      )

      logger.error(
        'error.stack: ',
        error.stack
      )

      throw error

    } finally {

      logger.debug(
        '**** requestCredential end ****'
      )
    }
  }


// ============================================================
// Credential 発行開始
// ============================================================

const requestVC =
  async () => {

    logger.debug(
      '**** requestVC start ****'
    )

    try {

      // ------------------------------
      // Offer 情報読み込み
      // ------------------------------

      const offerDetails =
        readJsonFile(
          OFFER_DETAILS_FILE
        )


      if (
        !Array.isArray(
          offerDetails
        )
        ||
        offerDetails.length === 0
      ) {

        throw new Error(
          'Credential Offer 情報が存在しません。'
        )
      }


      const results = []


      // ------------------------------
      // Profile ごとに処理
      // ------------------------------

      for (
        const offerDetailResult
        of offerDetails
      ) {

        const result =
          await requestCredential(
            offerDetailResult
          )


        results.push(
          result
        )
      }


      // ------------------------------
      // 結果保存
      // ------------------------------

      writeJsonFile(
        CREDENTIAL_RESULT_FILE,
        results
      )


      logger.debug('')
      logger.debug(
        '========================================'
      )

      logger.debug(
        'Credential 発行完了'
      )

      logger.debug(
        '========================================'
      )

      logger.debug(
        `発行結果: ${CREDENTIAL_RESULT_FILE}`
      )

    } catch (error) {

      logger.error(
        'error.message: ',
        error.message
      )

      logger.error(
        'error.stack: ',
        error.stack
      )

      throw error

    } finally {

      logger.debug(
        '**** requestVC end ****'
      )
    }
  }


// ============================================================
// Main
// ============================================================

const main =
  async () => {

    const command =
      process.argv[2]


    try {

      switch (command) {

        /**
         * 1.
         * Offer / Authorization URL を生成
         */
        case 'getOfferDetails':

          await getOfferDetails()

          break


        /**
         * 2.
         * JSON の redirectUrl を使って
         * Credential を発行
         */
        case 'requestVC':

          await requestVC()

          break


        default:

          logger.debug(
            '使用方法:'
          )

          logger.debug(
            'node openid4vci-authorization-code-credential-issue.js getOfferDetails'
          )

          logger.debug(
            'node openid4vci-authorization-code-credential-issue.js requestVC'
          )

          break
      }

    } catch (error) {

      logger.error(
        '処理に失敗しました。'
      )

      logger.error(
        'error.message: ',
        error.message
      )

      logger.error(
        'error.stack: ',
        error.stack
      )

      process.exitCode = 1
    }
  }


main()
