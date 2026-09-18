  // resolvePresentationRequest,
  // matchPresentationCredentials,
  // buildVpToken,
  // sendPresentationResponse,

const readline = require('readline')
const verifier2Service = require('./services/verifier2-service')
const wallet2Service = require('./services/wallet2-service')
const logger = require('./utils/logger')

const WALLET_ID = 'Wallet IDを指定'
const HOLDER_DID = null
const HOLDER_KEY_ID = null

const inputValue = (message) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

const selectCredential = async (
  walletId,
  queryId,
  credentialIds
) => {
  logger.debug(
    `DCQL Query [${queryId}] に一致する Credential を確認します。`
  )

  const credentials = []

  for (const credentialId of credentialIds) {
    const credential =
      await wallet2Service.getCredential(
        walletId,
        credentialId
      )

    credentials.push({
      credentialId,
      credential,
    })
  }

  console.log('')
  console.log(`DCQL Query : ${queryId}`)
  console.log('一致する Credential :')
  console.log('')

  credentials.forEach((item, index) => {
    console.log(`[${index + 1}]`)
    console.log(`Credential ID : ${item.credentialId}`)
    console.log(
      JSON.stringify(item.credential, null, 2)
    )
    console.log('')
  })

  if (credentials.length === 1) {
    logger.debug(
      '一致する Credential が1件のため、自動的に選択します。'
    )

    return credentials[0].credentialId
  }

  while (true) {
    const input = await inputValue(
      '提示する Credential を選択してください: '
    )

    const index = Number(input) - 1

    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < credentials.length
    ) {
      return credentials[index].credentialId
    }

    console.log('正しい番号を入力してください。')
  }
}

const verifyCredential = async () => {
  logger.debug('*** verifyCredential start ***')

  try {
    logger.debug('Wallet 情報を確認します。')

    const wallet =
      await wallet2Service.getWallet(WALLET_ID)

    logger.debug('Wallet : ')
    logger.debug(JSON.stringify(wallet, null, 2))

    logger.debug(
      'Wallet に保存されている Credential を確認します。'
    )

    const walletCredentials =
      await wallet2Service.getCredentials(WALLET_ID)

    logger.debug('Credentials : ')
    logger.debug(
      JSON.stringify(walletCredentials, null, 2)
    )

    logger.debug(
      'Verification Session を作成します。'
    )

    const verificationSession =
      await verifier2Service.createVerificationSession({
        dcqlQuery: {
          credentials: [
            {
              id: 'awards',
              format: 'jwt_vc_json',
            },
          ],
        },
      })

    logger.debug('Verification Session : ')
    logger.debug(
      JSON.stringify(verificationSession, null, 2)
    )

    const sessionId = verificationSession.sessionId

    if (!sessionId) {
      throw new Error(
        'Verification Session の sessionId が取得できません。'
      )
    }

    const requestUrl =
      verificationSession.bootstrapAuthorizationRequestUrl

    if (!requestUrl) {
      throw new Error(
        'bootstrapAuthorizationRequestUrl が取得できません。'
      )
    }

    logger.debug('Authorization Request URL : ')
    logger.debug(requestUrl)

    logger.debug(
      'Authorization Request を確認します。'
    )

    const authorizationRequest =
      await verifier2Service.getAuthorizationRequest(
        sessionId
      )

    logger.debug('Authorization Request : ')
    logger.debug(
      typeof authorizationRequest === 'string'
        ? authorizationRequest
        : JSON.stringify(
            authorizationRequest,
            null,
            2
          )
    )

    logger.debug(
      'Presentation Request を解析します。'
    )

    const resolvedRequest =
      await wallet2Service.resolvePresentationRequest(
        WALLET_ID,
        requestUrl
      )

    logger.debug('Resolved Request : ')
    logger.debug(
      JSON.stringify(resolvedRequest, null, 2)
    )

    const dcqlQuery = resolvedRequest.dcqlQuery

    if (!dcqlQuery) {
      throw new Error(
        'Authorization Request に DCQL Query が存在しません。'
      )
    }

    logger.debug(
      '条件に一致する Credential を検索します。'
    )

    const matchResult =
      await wallet2Service.matchPresentationCredentials(
        WALLET_ID,
        dcqlQuery
      )

    logger.debug('Credential Matching Result : ')
    logger.debug(
      JSON.stringify(matchResult, null, 2)
    )

    if (!matchResult.matchCount) {
      throw new Error(
        '条件に一致する Credential が存在しません。'
      )
    }

    const matchedCredentialIds =
      matchResult.matchedCredentialIds || {}

    const selectedCredentialOptions = []

    for (
      const [queryId, credentialIds]
      of Object.entries(matchedCredentialIds)
    ) {
      if (!credentialIds || credentialIds.length === 0) {
        continue
      }

      const credentialId =
        await selectCredential(
          WALLET_ID,
          queryId,
          credentialIds
        )

      selectedCredentialOptions.push({
        queryId,
        credentialId,
      })
    }

    if (selectedCredentialOptions.length === 0) {
      throw new Error(
        '提示する Credential が選択されていません。'
      )
    }

    logger.debug('選択した Credential : ')
    logger.debug(
      JSON.stringify(
        selectedCredentialOptions,
        null,
        2
      )
    )

    logger.debug('VP Token を生成します。')

    const vpTokenParams = {
      requestUrl,
      selectedCredentialOptions,
    }

    if (HOLDER_KEY_ID) {
      vpTokenParams.keyId = HOLDER_KEY_ID
    }

    if (HOLDER_DID) {
      vpTokenParams.did = HOLDER_DID
    }

    const vpTokenResult =
      await wallet2Service.buildVpToken(
        WALLET_ID,
        vpTokenParams
      )

    logger.debug('VP Token Result : ')
    logger.debug(
      JSON.stringify(vpTokenResult, null, 2)
    )

    if (!vpTokenResult.vpToken) {
      throw new Error(
        'vpToken が生成されませんでした。'
      )
    }

    logger.debug(
      'Presentation Response を Verifier2 に送信します。'
    )

    const responseParams = {
      requestUrl,
      vpToken: vpTokenResult.vpToken,
    }

    if (vpTokenResult.idToken) {
      responseParams.idToken =
        vpTokenResult.idToken
    }

    const presentationResult =
      await wallet2Service.sendPresentationResponse(
        WALLET_ID,
        responseParams
      )

    logger.debug('Presentation Result : ')
    logger.debug(
      JSON.stringify(presentationResult, null, 2)
    )

    logger.debug(
      'Verification Result を確認します。'
    )

    const verificationResult =
      await verifier2Service.getVerificationSession(
        sessionId
      )

    logger.debug('Verification Result : ')
    logger.debug(
      JSON.stringify(verificationResult, null, 2)
    )

    const result = {
      walletId: WALLET_ID,
      sessionId,
      matchedCredentialIds,
      selectedCredentialOptions,
      presentationResult,
      verificationResult,
    }

    logger.debug('Verification 処理結果 : ')
    logger.debug(
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** verifyCredential end ***')
  }
}

verifyCredential()
