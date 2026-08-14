AuthenticationMethod.PWD -> {
    val redirectUri = authReq.redirectUri ?: ""
    
    // 1. 根据 redirectUri 区分 个人(individual) 与 组织(corporate)
    val targetType = when {
        redirectUri.contains("corporate", ignoreCase = true) -> "corporate"
        redirectUri.contains("individual", ignoreCase = true) -> "individual"
        else -> throw AuthorizationError(
            authorizationRequest = authReq,
            errorCode = AuthorizationErrorCode.invalid_request,
            message = "Invalid redirectUri: Must specify 'individual' or 'corporate'"
        )
    }

    // 2. 将 authReq 转为 Query 串并做 URL Path 节点编码（关键！）
    val encodedAuthReq = authReq.toHttpQueryString().encodeURLPathComponent()
    
    // 3. 拼装带有 targetType 的重定向路径
    val externalLoginUrl = "${metadata.issuer}/external_login/$targetType/$encodedAuthReq"

    logger.info { "Redirecting to external login URL: $externalLoginUrl" }

    call.response.apply {
        status(HttpStatusCode.Found)
        header(HttpHeaders.Location, externalLoginUrl)
    }
    return@get
}
