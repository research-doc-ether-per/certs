result.transmissionSuccess == false -> {
        println("====== OID4VP verify failed ======")
        println("WalletPresentResult: $result")
        if (result is Throwable) { 
            (result as Throwable).printStackTrace() 
        } else if (result.toString().contains("exception")) {
            println("Possible internal error: ${result}")
        }
        throw IllegalStateException("OpenID4VP presentation transmission failed")
        }




println("==================================================")
println("Verifier2 投递受信 セッションID $sessionId")
println("ウォレットからのリクエストボディ $body")
println("==================================================")


runCatching {
            call.respondHandleDirectPostResponse(
                verificationSession = verificationSession,
                updateSessionCallback = updateSessionCallback,
                failSessionCallback = failSessionCallback
            )
        }.onSuccess {
            println("==================================================")
            println("Verifier2 レスポンス処理 正常完了")
            println("==================================================")
        }.onFailure { error ->
            println("==================================================")
            println("Verifier2 レスポンス処理 エラー発生")
            println("==================================================")
            error.printStackTrace() // ここで署名検証エラーなどの詳細が出力されます
            throw error
        }
