
suspend fun RoutingCall.respondHandleDirectPostResponse(
        verificationSession: Verification2Session?,
        updateSessionCallback: suspend (session: Verification2Session, event: SessionEvent, block: Verification2Session.() -> Unit) -> Unit,
        failSessionCallback: suspend (session: Verification2Session, event: SessionEvent, updateSession: suspend (Verification2Session, SessionEvent, block: Verification2Session.() -> Unit) -> Unit) -> Unit,
        policyContext: PolicyExecutionContext = PolicyExecutionContext.Empty,
    ) {
        val call = this

        if (verificationSession == null) {
            println("==================================================")
            println("Verifier2 エラー 検証セッションがヌルです")
            println("==================================================")
            Verifier2Response.Verifier2Error.UNKNOWN_VERIFICATION_SESSION.throwAsError()
        }

        verificationSession.expirationDate?.let { expirationDate ->
            if (expirationDate < Clock.System.now()) {
                println("==================================================")
                println("Verifier2 エラー 検盛セッションの有効期限が切れています")
                println("==================================================")
                Verifier2Response.Verifier2Error.EXPIRED_VERIFICATION_SESSION.throwAsError()
            }
        }

        try {
            // ウォレットから送信されたリクエストのパースを試みます
            val responseData = call.parseHttpRequestToDirectPostResponse()
            
            println("==================================================")
            println("Verifier2 パース後のデータ構造 $responseData")
            println("==================================================")

            val result = handleDirectPost(
                verificationSession = verificationSession,
                responseData = responseData,
                updateSessionCallback = updateSessionCallback,
                failSessionCallback = failSessionCallback,
                policyContext = policyContext
            )

            // 正常に処理された場合の返却データをコンソールに出力します
            println("==================================================")
            println("Verifier2 検証ロジック正常終了 ウォレットへの返却データ $result")
            println("==================================================")
            
            call.respond(result)
        } catch (e: PresentationRejectionException) {
            // プレゼンテーションが明示的に拒否された場合の詳細を出力します
            println("==================================================")
            println("Verifier2 プレゼンテーション拒否 400エラーを返却します")
            println("エラーメッセージ ${e.message}")
            println("==================================================")
            
            log.debug { "Presentation rejected, responding 400: ${e.message}" }
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "invalid_request", "error_description" to (e.message ?: "Presentation rejected")))
        } catch (t: Throwable) {
            // 上記以外の予期せぬ重大な例外や検証エンジンのエラーをここで補足します
            println("==================================================")
            println("Verifier2 システムシステムエラーまたは検証内部エラーが発生しました")
            println("例外クラス名 ${t.javaClass.name}")
            println("例外メッセージ ${t.message}")
            println("==================================================")
            t.printStackTrace()
            throw t
        }
    }



suspend fun handleDirectPost(
        verificationSession: Verification2Session,
        responseData: DirectPostResponse,
        updateSessionCallback: suspend (session: Verification2Session, event: SessionEvent, block: Verification2Session.() -> Unit) -> Unit,
        failSessionCallback: suspend (session: Verification2Session, event: SessionEvent, updateSession: suspend (Verification2Session, SessionEvent, block: Verification2Session.() -> Unit) -> Unit) -> Unit,
        policyContext: PolicyExecutionContext = PolicyExecutionContext.Empty,
    ): Map<String, String> {
        suspend fun Verification2Session.updateSession(event: SessionEvent, block: Verification2Session.() -> Unit) =
            updateSessionCallback.invoke(this, event, block)

        suspend fun Verification2Session.failSession(event: SessionEvent) =
            failSessionCallback.invoke(this, event, updateSessionCallback)

        log.debug { "Handling direct post for received data: $responseData" }

        val session = verificationSession
        val responseMode = session.authorizationRequest.responseMode
        val isAnnexC = verificationSession.setup is DcApiAnnexCFlowSetup

        if (responseData is ErrorResponseDirectPost) {
            println("==================================================")
            println("Verifier2 handleDirectPost ウォレットからエラーレスポンスを受信しました $responseData")
            println("==================================================")
            return handleWalletErrorResponse(session, responseData, updateSessionCallback)
        }

        // レスポンスボディからトークン文字列を抽出します
        val (vpTokenString, receivedState) = parseResponseBody(
            responseMode = responseMode,
            responseData = responseData,
            session = session,
            ephemeralDecryptionKey = session.ephemeralDecryptionKey
        )

        println("==================================================")
        println("Verifier2 handleDirectPost トークン抽出完了")
        println("受信したステート $receivedState")
        println("期待するステート ${session.authorizationRequest.state}")
        println("==================================================")

        if (receivedState != session.authorizationRequest.state) {
            println("==================================================")
            println("Verifier2 エラー ステートパラメータが一致しません")
            println("==================================================")
            Verifier2Response.Verifier2Error.INVALID_STATE_PARAMETER.throwAsError()
        }

        // Tokenのパース処理を行います
        val vpTokenContents = parseVpToken(vpTokenString)
        println("==================================================")
        println("Verifier2 handleDirectPost パース後のトークン内容 $vpTokenContents")
        println("==================================================")
        
        log.debug { "Parsed vp_token for state $receivedState: $vpTokenContents" }

        session.updateSession(SessionEvent.attempted_presentation) {
            attempted = true
            status = Verification2Session.VerificationSessionStatus.PROCESSING_FLOW
            presentedRawData = Verification2Session.PresentedRawData(vpTokenContents, receivedState)
        }

        // 核心的なポリシー検証と署名検証エンジンを実行します
        println("==================================================")
        println("Verifier2 handleDirectPost 検証エンジンを実行します")
        println("==================================================")

        try {
            PresentationVerificationEngine.executeAllVerification(
                vpTokenContents,
                session,
                updateSessionCallback,
                failSessionCallback,
                policyContext
            )
            println("==================================================")
            println("Verifier2 handleDirectPost 検証エンジン実行完了")
            println("==================================================")
        } catch (t: Throwable) {
            println("==================================================")
            println("Verifier2 handleDirectPost 検証エンジン内部でエラーが発生しました")
            println("エラー詳細 ${t.message}")
            println("==================================================")
            throw t
        }

        val optionalSuccessRedirectUrl = session.redirects?.successRedirectUri
        val willRedirect = optionalSuccessRedirectUrl != null

        return if (willRedirect) {
            println("==================================================")
            println("Verifier2 handleDirectPost リダイレクトURLを返却します $optionalSuccessRedirectUrl")
            println("==================================================")
            mapOf("redirect_uri" to optionalSuccessRedirectUrl)
        } else {
            println("==================================================")
            println("Verifier2 handleDirectPost 受信完了メッセージを返却します")
            println("==================================================")
            mapOf(
                "status" to "received",
                "message" to "Presentation received and is being processed."
            )
        }
    }
