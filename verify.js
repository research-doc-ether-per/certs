// 個人向け OAuth 認証
authenticate("auth-oauth-individual") {
    install(authOAuthInterceptor)

    get("external_login/individual/{internalAuthReq}", OpenId4VciRoutesDocs.externalLogin()) {
        // 個人向け Keycloak へリダイレクト
    }

    get("external/individual/oauth/callback", OpenId4VciRoutesDocs.externalOAuthCallback()) {
        val requestId = requireNotNull(call.callId) { "Missing call ID" }
        val principal = call.principal<OAuthAccessTokenResponse.OAuth2>()
        val idToken = principal?.extraParameters?.get("id_token")
        val state = call.request.queryParameters["state"]

        val response = protocolService.processExternalAuthorizationCallback(
            authServerState = state,
            idToken = idToken,
            requestId = requestId,
        )

        response.redirectUri?.let { redirectUri ->
            response.headers.filterKeys { it.lowercase() != "location" }
                .forEach { (name, value) -> call.response.headers.append(name, value) }

            call.respondRedirect(redirectUri)
        } ?: run {
            response.headers.forEach { (name, value) -> call.response.headers.append(name, value) }
            call.respond(HttpStatusCode.fromValue(response.status), response.body ?: "")
        }
    }
}


// 法人向け OAuth 認証
authenticate("auth-oauth-corporate") {
    install(authOAuthInterceptor)

    get("external_login/corporate/{internalAuthReq}", OpenId4VciRoutesDocs.externalLogin()) {
        // 法人向け Keycloak へリダイレクト
    }

    get("external/corporate/oauth/callback", OpenId4VciRoutesDocs.externalOAuthCallback()) {
        val requestId = requireNotNull(call.callId) { "Missing call ID" }
        val principal = call.principal<OAuthAccessTokenResponse.OAuth2>()
        val idToken = principal?.extraParameters?.get("id_token")
        val state = call.request.queryParameters["state"]

        val response = protocolService.processExternalAuthorizationCallback(
            authServerState = state,
            idToken = idToken,
            requestId = requestId,
        )

        response.redirectUri?.let { redirectUri ->
            response.headers.filterKeys { it.lowercase() != "location" }
                .forEach { (name, value) -> call.response.headers.append(name, value) }

            call.respondRedirect(redirectUri)
        } ?: run {
            response.headers.forEach { (name, value) -> call.response.headers.append(name, value) }
            call.respond(HttpStatusCode.fromValue(response.status), response.body ?: "")
        }
    }
}
