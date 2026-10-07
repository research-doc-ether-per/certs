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

const credentialOfferData =
  require('../input-datas/offer-data.json')

const walletInfo =
  require('../input-datas/wallet-info.json')


// 同一 Credential Offer を複数の Holder で利用するか。
const multipleUseAllowed = true


const CLIENT_ID = 'wallet-web'

const REDIRECT_URI =
  'http://10.0.2.15:6101/individual'


/**
 * 発行対象の Credential を定義します。
 *
 * key:
 *   Issuer2 の profileId
 *
 * value:
 *   offer-data.json の設定キー
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

/**
 * 出力先ディレクトリを作成します。
 */
const createOutputDirectory = () => {

  // 出力先が存在しない場合のみ作成します。
  if (
    !fs.existsSync(
      OUTPUT_PATH
    )
  ) {

    fs.mkdirSync(
      OUTPUT_PATH,
      {
        recursive: true
      }
    )
  }
}


/**
 * JSON ファイルを出力します。
 */
const writeJsonFile = (
  filePath,
  data
) => {

  // 出力先ディレクトリを確認します。
  createOutputDirectory()

  // JSON を整形して保存します。
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


/**
 * JSON ファイルを読み込みます。
 */
const readJsonFile = filePath => {

  // ファイルが存在するか確認します。
  if (
    !fs.existsSync(
      filePath
    )
  ) {

    throw new Error(
      `ファイルが存在しません: ${filePath}`
    )
  }

  // JSON ファイルを読み込みます。
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

/**
 * Credential Profile を取得します。
 */
const checkCredentialProfile =
  async profileId => {

    logger.debug(
      'Credential Profile を確認します。: ',
      profileId
    )

    // Issuer2 から Profile を取得します。
    const profile =
      await issuer2Service.getProfile(
        profileId
      )

    // Profile が存在しない場合はエラーにします。
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

/**
 * Authorization Code Flow 用の
 * Credential Offer を作成します。
 */
const createCredentialOffer =
  async (
    profileId,
    config
  ) => {

    logger.debug(
      'Credential Offer を作成します。: ',
      profileId
    )

    /**
     * 複数 Holder で同一 Offer を利用する場合は
     * issuer_state を含めないようにします。
     *
     * true  : OMIT
     * false : INCLUDE
     */
    const issuerStateMode =
      multipleUseAllowed
        ? 'OMIT'
        : 'INCLUDE'


    // Issuer2 で Credential Offer を作成します。
    const offer =
      await issuer2Service.createCredentialOffer({

        profileId,

        authMethod:
          issuer2Service
            .AUTH_METHOD
            .AUTHORIZATION_CODE,

        valueMode:
          'BY_REFERENCE',

        issuerStateMode,

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


    // Offer が取得できない場合はエラーにします。
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

/**
 * Wallet2 で Credential Offer を解析します。
 */
const resolveCredentialOffer =
  async (
    walletId,
    credentialOffer
  ) => {

    logger.debug(
      'Credential Offer を解析します。'
    )

    // Credential Offer の詳細情報を取得します。
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

/**
 * Authorization Code Flow 用の
 * Authorization URL を生成します。
 */
const generateAuthorizationUrl =
  async (
    walletId,
    credentialOffer
  ) => {

    logger.debug(
      'Authorization URL を生成します。'
    )

    /**
     * Holder ごとに Authorization URL を生成します。
     *
     * PKCE を使用するため、
     * state / codeVerifier も Holder ごとに異なります。
     */
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

/**
 * 発行対象の Holder DID を取得します。
 */
const getTargetHolderDids = () => {

  /**
   * 一対一の場合は、
   * defaultDidId のみ使用します。
   */
  if (
    !multipleUseAllowed
  ) {

    if (
      !HOLDER_DID
    ) {

      throw new Error(
        'defaultDidId が設定されていません。'
      )
    }

    return [
      HOLDER_DID
    ]
  }


  /**
   * 一対多の場合は、
   * walletInfo.dids をすべて使用します。
   */
  const holderDids =
    HOLDER_DIDS
      .map(item => {

        // 配列要素が文字列の場合
        if (
          typeof item
          ===
          'string'
        ) {

          return item
        }

        // オブジェクトの場合は did を取得します。
        return item?.did
      })
      .filter(Boolean)


  // Holder DID が1件もない場合はエラーにします。
  if (
    holderDids.length
    ===
    0
  ) {

    throw new Error(
      'Holder DID が設定されていません。'
    )
  }

  return holderDids
}


// ============================================================
// Offer / Authorization URL 作成
// ============================================================

/**
 * Credential Offer を作成し、
 * Holder ごとの Authorization URL を生成します。
 */
const getOfferDetail =
  async (
    profileId,
    credentialConfig
  ) => {

    logger.debug(
      '**** getOfferDetail start ****'
    )

    try {

      // ------------------------------------------------------
      // Credential Profile を取得します。
      // ------------------------------------------------------

      const profile =
        await checkCredentialProfile(
          profileId
        )


      // ------------------------------------------------------
      // Credential Offer を作成します。
      //
      // 複数 Holder の場合でも
      // Offer 自体は1回だけ作成します。
      // ------------------------------------------------------

      const offer =
        await createCredentialOffer(
          profileId,
          credentialConfig
        )


      // ------------------------------------------------------
      // BSL を作成します。
      // ------------------------------------------------------

      await vcStatusService
        .createBSL(
          profile.name,
          profile.issuerDid
        )


      // ------------------------------------------------------
      // Credential Offer を解析します。
      //
      // 同じ Offer を使用するため、
      // 解析は1回だけ行います。
      // ------------------------------------------------------

      const offerDetail =
        await resolveCredentialOffer(
          WALLET_ID,
          offer.credentialOffer
        )


      // ------------------------------------------------------
      // 発行対象 Holder を取得します。
      // ------------------------------------------------------

      const holderDids =
        getTargetHolderDids()


      /**
       * Holder ごとの
       * Authorization Flow 情報を保存します。
       */
      const holderFlows = []


      // ------------------------------------------------------
      // Holder ごとに Authorization URL を生成します。
      // ------------------------------------------------------

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


        /**
         * 同一 Credential Offer を使用して
         * Holder ごとに Authorization URL を生成します。
         */
        const authorizationResult =
          await generateAuthorizationUrl(
            WALLET_ID,
            offer.credentialOffer
          )


        // Authorization URL が取得できたか確認します。
        if (
          !authorizationResult
            .authorizationUrl
        ) {

          throw new Error(
            `Authorization URL が取得できません: ${holderDid}`
          )
        }


        // state が取得できたか確認します。
        if (
          !authorizationResult
            .state
        ) {

          throw new Error(
            `state が取得できません: ${holderDid}`
          )
        }


        /**
         * Holder DID と Authorization 情報を
         * 同じレコードとして保存します。
         *
         * redirectUrl はブラウザ認証後に
         * 手動で設定します。
         */
        holderFlows.push({

          holderDid,

          authorizationResult,

          redirectUrl:
            null,
        })
      }


      /**
       * Offer と Holder ごとの Authorization 情報を
       * まとめて返します。
       */
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
// Offer 情報保存
// ============================================================

/**
 * Credential Offer と
 * Holder ごとの Authorization URL を生成し、
 * JSON ファイルに保存します。
 */
const getOfferDetails =
  async () => {

    logger.debug(
      '**** getOfferDetails start ****'
    )

    try {

      const results = []


      // ------------------------------------------------------
      // 発行対象 Credential を順番に処理します。
      // ------------------------------------------------------

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


        // offer-data.json から設定を取得します。
        const config =
          credentialOfferData
            ?.[configId]


        // 設定が存在しない場合はスキップします。
        if (
          !config
        ) {

          logger.debug(
            `Credential 設定が存在しないためスキップします: ${configId}`
          )

          continue
        }


        // Offer と Authorization URL を生成します。
        const result =
          await getOfferDetail(
            profileId,
            config
          )


        results.push(
          result
        )
      }


      // ------------------------------------------------------
      // 生成結果を JSON に保存します。
      // ------------------------------------------------------

      writeJsonFile(
        OFFER_DETAILS_FILE,
        results
      )


      // ------------------------------------------------------
      // Authorization URL をログにも表示します。
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // 次の操作を案内します。
      // ------------------------------------------------------

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
// Redirect URL
// ============================================================

/**
 * ブラウザ認証後の Redirect URL から
 * Authorization Code と state を取得します。
 */
const parseAuthorizationResult =
  redirectUrl => {

    // Redirect URL が設定されているか確認します。
    if (
      !redirectUrl
    ) {

      throw new Error(
        'Redirect URL が設定されていません。'
      )
    }


    let url


    // Redirect URL を URL オブジェクトに変換します。
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


    // Authorization Code を取得します。
    const code =
      url
        .searchParams
        .get('code')


    // state を取得します。
    const state =
      url
        .searchParams
        .get('state')


    // Authorization Code が存在するか確認します。
    if (
      !code
    ) {

      throw new Error(
        'Redirect URL に Authorization Code が含まれていません。'
      )
    }


    // state が存在するか確認します。
    if (
      !state
    ) {

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
// state
// ============================================================

/**
 * Authorization Request 時の state と
 * Redirect URL の state が一致するか確認します。
 */
const validateState =
  (
    expectedState,
    actualState
  ) => {

    // Redirect URL 側の state を確認します。
    if (
      !actualState
    ) {

      throw new Error(
        'Redirect URL から state を取得できません。'
      )
    }


    // state が一致するか確認します。
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

/**
 * Authorization Code を使用して
 * Credential を取得します。
 */
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


    /**
     * Wallet2 の
     * Authorized Credential 取得 API に渡す
     * パラメータを作成します。
     */
    const params = {

      // ブラウザ認証後に取得した Authorization Code
      code:
        authorizationCode,

      // Credential Issuer
      credentialIssuer:
        authorizationResult
          .credentialIssuerBaseUrl,

      // Credential Endpoint
      credentialEndpoint:
        offerDetail
          .credentialEndpoint,

      // Credential Configuration
      credentialConfigurationId:
        authorizationResult
          .credentialConfigurationId,

      // OAuth Client
      clientId:
        CLIENT_ID,

      // Authorization Request と同じ Redirect URI
      redirectUri:
        REDIRECT_URI,

      // 今回は DPoP を使用しない
      useDPoP:
        false,

      // Credential の Subject として使用する Holder DID
      did:
        holderDid,
    }


    /**
     * PKCE を使用している場合は
     * Holder ごとの codeVerifier を設定します。
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
     * nonceEndpoint が返されている場合のみ
     * パラメータに追加します。
     */
    if (
      authorizationResult
        .nonceEndpoint
    ) {

      params.nonceEndpoint =
        authorizationResult
          .nonceEndpoint
    }


    // Authorization Code を使用して Credential を取得します。
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

/**
 * Wallet2 に保存された Credential の
 * 詳細情報を取得します。
 */
const getCredentialDetails =
  async (
    walletId,
    credentialIds
  ) => {

    const credentials = []


    // Credential ID ごとに詳細を取得します。
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

/**
 * 1つの Credential Offer に対して、
 * Holder ごとに Credential を取得します。
 */
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


      // Holder 情報が存在するか確認します。
      if (
        !Array.isArray(
          holderFlows
        )
        ||
        holderFlows.length
        ===
        0
      ) {

        throw new Error(
          `Holder 情報が存在しません: ${profileId}`
        )
      }


      const holderResults = []


      // ------------------------------------------------------
      // Holder ごとに Credential を取得します。
      // ------------------------------------------------------

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


        // ----------------------------------------------------
        // Redirect URL が設定されているか確認します。
        // ----------------------------------------------------

        if (
          !redirectUrl
        ) {

          throw new Error(
            `Redirect URL が設定されていません: ${holderDid}`
          )
        }


        // ----------------------------------------------------
        // Redirect URL から code / state を取得します。
        // ----------------------------------------------------

        const authorization =
          parseAuthorizationResult(
            redirectUrl
          )


        // ----------------------------------------------------
        // Authorization Request 時の state と
        // Redirect URL の state を比較します。
        // ----------------------------------------------------

        validateState(
          authorizationResult
            .state,

          authorization
            .state
        )


        // ----------------------------------------------------
        // Authorization Code を使用して
        // Credential を取得します。
        // ----------------------------------------------------

        const receiveResult =
          await receiveCredential(
            offerDetailResult,
            holderFlow,
            authorization.code
          )


        // ----------------------------------------------------
        // 保存された Credential ID を取得します。
        // ----------------------------------------------------

        const credentialIds =
          receiveResult
            .credentialIds
          || []


        if (
          credentialIds.length
          ===
          0
        ) {

          throw new Error(
            `Credential が保存されていません: ${holderDid}`
          )
        }


        // ----------------------------------------------------
        // Credential 詳細を取得します。
        // ----------------------------------------------------

        const credentials =
          await getCredentialDetails(
            WALLET_ID,
            credentialIds
          )


        // ----------------------------------------------------
        // Holder ごとの発行結果を保存します。
        // ----------------------------------------------------

        holderResults.push({

          holderDid,

          redirectUrl,

          credentialIds,

          credentials,
        })
      }


      /**
       * 1つの Profile に対する
       * 全 Holder の発行結果を返します。
       */
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

/**
 * JSON に保存した Offer 情報を読み込み、
 * 設定済みの redirectUrl を使用して
 * Credential を発行します。
 */
const requestVC =
  async () => {

    logger.debug(
      '**** requestVC start ****'
    )

    try {

      // ------------------------------------------------------
      // getOfferDetails で保存した JSON を読み込みます。
      // ------------------------------------------------------

      const offerDetails =
        readJsonFile(
          OFFER_DETAILS_FILE
        )


      if (
        !Array.isArray(
          offerDetails
        )
        ||
        offerDetails.length
        ===
        0
      ) {

        throw new Error(
          'Credential Offer 情報が存在しません。'
        )
      }


      const results = []


      // ------------------------------------------------------
      // Profile ごとに Credential 発行を実行します。
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // 発行結果を JSON に保存します。
      // ------------------------------------------------------

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

/**
 * 実行コマンドに応じて処理を切り替えます。
 *
 * getOfferDetails:
 *   Offer と Authorization URL を生成します。
 *
 * requestVC:
 *   JSON に設定した redirectUrl を使用して
 *   Credential を取得します。
 */
const main =
  async () => {

    const command =
      process.argv[2]


    try {

      switch (
        command
      ) {

        /**
         * Step 1
         *
         * Credential Offer と
         * Authorization URL を生成します。
         */
        case 'getOfferDetails':

          await getOfferDetails()

          break


        /**
         * Step 2
         *
         * JSON の redirectUrl を使用して
         * Credential を発行します。
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

      process.exitCode =
        1
    }
  }


main()
