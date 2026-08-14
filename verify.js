individual {
    name = "keycloak-individual"
    authorizeUrl = "https://keycloak-individual.example.com/realms/individual/protocol/openid-connect/auth"
    accessTokenUrl = "https://keycloak-individual.example.com/realms/individual/protocol/openid-connect/token"
    clientId = "issuer_api_individual"
    clientSecret = "secret_individual"
}

corporate {
    name = "keycloak-corporate"
    authorizeUrl = "https://keycloak-corporate.example.com/realms/corporate/protocol/openid-connect/auth"
    accessTokenUrl = "https://keycloak-corporate.example.com/realms/corporate/protocol/openid-connect/token"
    clientId = "issuer_api_corporate"
    clientSecret = "secret_corporate"
}



@Serializable
data class OAuthConfig(
    val name: String,
    val authorizeUrl: String,
    val accessTokenUrl: String,
    val clientId: String,
    val clientSecret: String
)

@Serializable
data class AuthenticationServiceConfig(
    val individual: OAuthConfig,
    val corporate: OAuthConfig
)


  val config = ConfigManager.loadConfig<AuthenticationServiceConfig>("authentication-service")

install(Authentication) {
    // 注册个人 Auth Provider
    oauth("auth-oauth-individual") {
        client = httpClient
        providerLookup = {
            OAuthServerSettings.OAuth2ServerSettings(
                name = config.individual.name,
                authorizeUrl = config.individual.authorizeUrl,
                accessTokenUrl = config.individual.accessTokenUrl,
                clientId = config.individual.clientId,
                clientSecret = config.individual.clientSecret,
                // ...其他常规配置
            )
        }
        urlProvider = { "https://<your-host>/callback/individual" }
    }

    // 注册组织 Auth Provider
    oauth("auth-oauth-corporate") {
        client = httpClient
        providerLookup = {
            OAuthServerSettings.OAuth2ServerSettings(
                name = config.corporate.name,
                authorizeUrl = config.corporate.authorizeUrl,
                accessTokenUrl = config.corporate.accessTokenUrl,
                clientId = config.corporate.clientId,
                clientSecret = config.corporate.clientSecret,
                // ...其他常规配置
            )
        }
        urlProvider = { "https://<your-host>/callback/corporate" }
    }
}



AuthenticationMethod.PWD -> {
    val redirectUri = authReq.redirectUri ?: ""
    val targetType = when {
        redirectUri.contains("individual", ignoreCase = true) -> "individual"
        redirectUri.contains("corporate", ignoreCase = true) -> "corporate"
        else -> "individual" // 默认策略，可根据实际业务调整
    }

    call.response.apply {
        status(HttpStatusCode.Found)
        header(
            name = HttpHeaders.Location,
            // 路由拼接类型，引导至对应的受保护接口
            value = "${metadata.issuer}/external_login/$targetType/${authReq.toHttpQueryString()}"
        )
    }
    return@get
}
