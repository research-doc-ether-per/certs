if (FeatureManager.isFeatureEnabled(FeatureCatalog.legacyAuthenticationFeature)) {
    // 1. 注册个人用 Keycloak
    oauth("auth-oauth-individual") {
        client = HttpClient()
        providerLookup = {
            OAuthServerSettings.OAuth2ServerSettings(
                name = authenticationServiceConfig.individual.name,
                authorizeUrl = authenticationServiceConfig.individual.authorizeUrl,
                accessTokenUrl = authenticationServiceConfig.individual.accessTokenUrl,
                clientId = authenticationServiceConfig.individual.clientId,
                clientSecret = authenticationServiceConfig.individual.clientSecret,
                accessTokenRequiresBasicAuth = false,
                requestMethod = HttpMethod.Post,
                defaultScopes = listOf("openid", "profile", "email")
            )
        }
        urlProvider = { "${oidcConfig.publicBaseUrl}/wallet-api/auth/oidc-session" }
    }

    // 2. 注册组织用 Keycloak
    oauth("auth-oauth-corporate") {
        client = HttpClient()
        providerLookup = {
            OAuthServerSettings.OAuth2ServerSettings(
                name = authenticationServiceConfig.corporate.name,
                authorizeUrl = authenticationServiceConfig.corporate.authorizeUrl,
                accessTokenUrl = authenticationServiceConfig.corporate.accessTokenUrl,
                clientId = authenticationServiceConfig.corporate.clientId,
                clientSecret = authenticationServiceConfig.corporate.clientSecret,
                accessTokenRequiresBasicAuth = false,
                requestMethod = HttpMethod.Post,
                defaultScopes = listOf("openid", "profile", "email")
            )
        }
        urlProvider = { "${oidcConfig.publicBaseUrl}/wallet-api/auth/oidc-session" }
    }
}
