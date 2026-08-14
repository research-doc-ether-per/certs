AuthenticationMethod.PWD -> {
    val redirectUri = authReq.redirectUri ?: ""
    
    val targetType = when {
        redirectUri.contains("corporate", ignoreCase = true) -> "corporate"
        redirectUri.contains("individual", ignoreCase = true) -> "individual"
        else -> throw AuthorizationError(
            authorizationRequest = authReq,
            errorCode = AuthorizationErrorCode.invalid_request,
            message = "Invalid redirectUri: Must specify 'individual' or 'corporate' for authentication service"
        )
    }

    call.response.apply {
        status(HttpStatusCode.Found)
        header(
            name = HttpHeaders.Location,
            value = "${metadata.issuer}/external_login/$targetType/${authReq.toHttpQueryString()}"
        )
    }
    return@get
}


} catch (authExc: AuthorizationError) { 
        logger.error(authExc) { "Authorization error: " }
        call.response.apply {
            status(HttpStatusCode.Found)
            header(
                name = HttpHeaders.Location,
                value = URLBuilder(authExc.authorizationRequest.redirectUri!!).apply {
                    parameters.appendAll(
                        parametersOf(authExc.toAuthorizationErrorResponse().toHttpParameters())
                    )
                }.buildString()
            )
        }
    }
