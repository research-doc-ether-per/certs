post("/verify/{state}", getVerifyStateDocs()) {
    println("==== [verify route] start ====")

    val sessionId = call.parameters.getOrFail("state")
    println("sessionId = $sessionId")

    val params = call.receiveParameters().toMap()
    println("tokenResponseParameters = $params")

    val result = verificationUseCase.verify(
        sessionId = sessionId,
        tokenResponseParameters = params
    )

    println("verify() raw result = $result")
    println("result.isSuccess = ${result.isSuccess}")
    println("result.isFailure = ${result.isFailure}")

    if (result.isSuccess) {
        println("result.getOrNull() = ${result.getOrNull()}")
    } else {
        val error = result.exceptionOrNull()
        println("result.exceptionOrNull() = $error")
        println("result.exception message = ${error?.message}")
        error?.printStackTrace()
    }

    println("before notifySubscribers")
    verificationUseCase.notifySubscribers(sessionId)
    println("after notifySubscribers")

    result
        .onSuccess { redirectUri ->
            println("==== enter onSuccess ====")
            println("onSuccess redirectUri = $redirectUri")

            val session = verificationUseCase.getSession(sessionId)
            println("session = $session")
            println("session.walletInitiatedAuthState = ${session.walletInitiatedAuthState}")

            if (session.walletInitiatedAuthState != null) {
                val state = session.walletInitiatedAuthState
                val code = randomUUIDString()

                println("wallet initiated success flow")
                println("respondRedirect -> openid://?code=$code&state=$state")

                call.respondRedirect("openid://?code=$code&state=$state")
            } else {
                println("normal success flow")
                println("respond OK body = $redirectUri")

                call.respond(HttpStatusCode.OK, redirectUri)
            }
        }
        .onFailure { error ->
            println("==== enter onFailure ====")
            println("failure exception = $error")
            println("failure message = ${error.message}")
            error.printStackTrace()

            logger.debug(error) { "Verification failed ($error)" }

            val errorDescription = error.message ?: "Verification failed"
            println("errorDescription = $errorDescription")
            logger.error { "Error: $errorDescription" }

            val session = verificationUseCase.getSession(sessionId)
            println("session = $session")
            println("session.walletInitiatedAuthState = ${session.walletInitiatedAuthState}")

            when {
                session.walletInitiatedAuthState != null -> {
                    val state = session.walletInitiatedAuthState
                    val finalErrorDescription = getErrorDescription(error)

                    println("wallet initiated failure flow")
                    println("respondRedirect -> openid://?state=$state&error=invalid_request&error_description=$finalErrorDescription")

                    call.respondRedirect(
                        "openid://?state=$state&error=invalid_request&error_description=$finalErrorDescription"
                    )
                }

                error is FailedVerificationException && error.redirectUrl != null -> {
                    println("FailedVerificationException flow")
                    println("respond BadRequest redirectUrl = ${error.redirectUrl}")

                    call.respond(HttpStatusCode.BadRequest, error.redirectUrl)
                }

                else -> {
                    println("unhandled failure, throw again")
                    throw error
                }
            }
        }

    println("==== [verify route] end ====")
}
