private const val AUTHENTICATION_PROVIDER_PARAMETER = "authentication_provider"
private const val AUTHENTICATION_PROVIDER_INDIVIDUAL = "individual"
private const val AUTHENTICATION_PROVIDER_CORPORATE = "corporate"

// val redirectUri = "${metadataService.issuerBaseUrl()}/external_login/$authorizationRequestEnvelope"
val authenticationProvider = resolvedParameters[AUTHENTICATION_PROVIDER_PARAMETER]?.singleOrNull()
    ?: parameters[AUTHENTICATION_PROVIDER_PARAMETER]?.singleOrNull()
    ?: AUTHENTICATION_PROVIDER_INDIVIDUAL

if (authenticationProvider != AUTHENTICATION_PROVIDER_INDIVIDUAL && authenticationProvider != AUTHENTICATION_PROVIDER_CORPORATE) {
    val authorizationError = OAuthError(OAuthErrorCodes.INVALID_REQUEST, "Unsupported authentication provider: $authenticationProvider")

    notificationService.notify(
        requestId = requestId,
        session = issuanceSession,
        event = IssuanceSessionEvent.AUTHORIZATION_REQUEST_FAILED,
        error = authorizationError.error,
        errorDescription = authorizationError.description,
    )

    return oauth2Provider.writeAuthorizationError(authorizationRequest, authorizationError)
}

val redirectUri = "${metadataService.issuerBaseUrl()}/external_login/$authenticationProvider/$authorizationRequestEnvelope"

return AuthorizationResponseHttp(
    status = 302,
    redirectUri = redirectUri,
    headers = mapOf("Location" to redirectUri),
)
