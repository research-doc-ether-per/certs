/**
 * 証明書の提示・検証
 */
const verifyCredential = async (createSessionParams) => {
  logger.debug('**** verifyCredential start ****')

  try {
    // --------------------------------------------------
    // Verification Session を作成
    // --------------------------------------------------
    logger.debug('Verification Session を作成します。')

    const verificationSession =
      await verifier2Service.createVerificationSession(
        createSessionParams
      )

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

    // --------------------------------------------------
    // Authorization Request を確認
    // --------------------------------------------------
    logger.debug('Authorization Request を確認します。')

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

    // --------------------------------------------------
    // Presentation Request を解析
    // --------------------------------------------------
    logger.debug('Presentation Request を解析します。')

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

    // --------------------------------------------------
    // multipleUseAllowed に応じて Holder を切り替える
    // --------------------------------------------------
    const holderDids = multipleUseAllowed
      ? HOLDER_DIDS.filter(Boolean)
      : [HOLDER_DID].filter(Boolean)

    if (holderDids.length === 0) {
      throw new Error(
        '検証対象の Holder DID が存在しません。'
      )
    }

    logger.debug('Verification Holder DIDs : ')
    logger.debug(
      JSON.stringify(holderDids, null, 2)
    )

    const holderResults = []

    // --------------------------------------------------
    // 同じ Presentation Request URL を
    // 複数 Holder で利用する
    // --------------------------------------------------
    for (const holderDid of holderDids) {
      logger.debug(
        `**** Holder verification start : ${holderDid} ****`
      )

      try {
        // ----------------------------------------------
        // 条件に一致する Credential を検索
        // ----------------------------------------------
        logger.debug(
          '条件に一致する Credential を検索します。'
        )

        const matchResult =
          await wallet2Service.matchPresentationCredentials(
            WALLET_ID,
            dcqlQuery
          )

        logger.debug(
          'Credential Matching Result : '
        )
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
        const selectCredentialDetails = []

        // ----------------------------------------------
        // 提示する Credential を選択
        // ----------------------------------------------
        for (
          const [queryId, credentialIds]
          of Object.entries(matchedCredentialIds)
        ) {
          if (
            !credentialIds ||
            credentialIds.length === 0
          ) {
            continue
          }

          const credentialId =
            await selectCredential(
              WALLET_ID,
              queryId,
              credentialIds
            )

          const credentialDetail =
            await wallet2Service.getCredential(
              WALLET_ID,
              credentialId
            )

          selectedCredentialOptions.push({
            queryId,
            credentialId,
          })

          selectCredentialDetails.push({
            credentialId,
            credentialDetail,
          })
        }

        if (
          selectedCredentialOptions.length === 0
        ) {
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

        // ----------------------------------------------
        // VP Token を生成
        // ----------------------------------------------
        logger.debug('VP Token を生成します。')

        const vpTokenParams = {
          requestUrl,
          selectedCredentialOptions,
          did: holderDid,
        }

        // multipleUseAllowed = false の場合は
        // 既存の defaultKeyId を使用する
        //
        // multipleUseAllowed = true の場合、
        // DID ごとの Key が異なる可能性があるため、
        // 固定の HOLDER_KEY_ID は設定しない
        if (
          !multipleUseAllowed &&
          HOLDER_KEY_ID
        ) {
          vpTokenParams.keyId =
            HOLDER_KEY_ID
        }

        const vpTokenResult =
          await wallet2Service.buildVpToken(
            WALLET_ID,
            vpTokenParams
          )

        logger.debug('VP Token Result : ')
        logger.debug(
          JSON.stringify(
            vpTokenResult,
            null,
            2
          )
        )

        if (!vpTokenResult.vpToken) {
          throw new Error(
            'vpToken が生成されませんでした。'
          )
        }

        // ----------------------------------------------
        // Presentation Response を送信
        // ----------------------------------------------
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

        logger.debug(
          'Presentation Result : '
        )
        logger.debug(
          JSON.stringify(
            presentationResult,
            null,
            2
          )
        )

        holderResults.push({
          holderDid,
          success: true,
          presentationResult,
          selectCredentialDetails,
        })
      } catch (error) {
        logger.error(
          `Holder verification error (${holderDid}) : `,
          error.message
        )

        holderResults.push({
          holderDid,
          success: false,
          error: error.message,
        })
      } finally {
        logger.debug(
          `**** Holder verification end : ${holderDid} ****`
        )
      }
    }

    // --------------------------------------------------
    // Verification Result を確認
    // --------------------------------------------------
    logger.debug(
      'Verification Result を確認します。'
    )

    const verificationResult =
      await verifier2Service
        .getVerificationSessionInfo(sessionId)

    logger.debug('Verification Result : ')
    logger.debug(
      JSON.stringify(
        verificationResult,
        null,
        2
      )
    )

    const extractedPolicyResults =
      extractPolicyResults(
        verificationResult
      )

    logger.debug(
      'Extracted Policy Result : '
    )
    logger.debug(
      JSON.stringify(
        extractedPolicyResults,
        null,
        2
      )
    )

    // --------------------------------------------------
    // Result
    // --------------------------------------------------
    const result = {
      walletId: WALLET_ID,
      sessionId,
      requestUrl,
      createVerificationSessionParams:
        createSessionParams,
      holderResults,
      extractedPolicyResults,
    }

    logger.debug(
      'Verification 処理結果 : '
    )
    logger.debug(
      JSON.stringify(result, null, 2)
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
      '**** verifyCredential end ****'
    )
  }
}
