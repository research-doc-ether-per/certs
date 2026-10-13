val redirectUriValue = authorizationRequest.redirectUri
    ?: return oauth2Provider.writeAuthorizationError(
        authorizationRequest,
        OAuthError(OAuthErrorCodes.INVALID_REQUEST, "redirect_uri is missing"),
    )

val authenticationProvider = when {
    redirectUriValue.contains("individual", ignoreCase = true) -> "individual"
    redirectUriValue.contains("corporate", ignoreCase = true) -> "corporate"
    else -> {
        val authorizationError = OAuthError(
            OAuthErrorCodes.INVALID_REQUEST,
            "Unable to determine authentication provider from redirect_uri",
        )

        notificationService.notify(
            requestId = requestId,
            session = issuanceSession,
            event = IssuanceSessionEvent.AUTHORIZATION_REQUEST_FAILED,
            error = authorizationError.error,
            errorDescription = authorizationError.description,
        )

        return oauth2Provider.writeAuthorizationError(authorizationRequest, authorizationError)
    }
}

val redirectUri = "${metadataService.issuerBaseUrl()}/external_login/$authenticationProvider/$authorizationRequestEnvelope"

return AuthorizationResponseHttp(
    status = 302,
    redirectUri = redirectUri,
    headers = mapOf("Location" to redirectUri),
)
