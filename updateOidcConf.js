
data class OidcConfiguration(
    val publicBaseUrl: String = "http://localhost:7101",
    val providerName: String = "keycloak",
    val oidcRealm: String = "http://keycloak:8080/realms/my-realm",
    val oidcJwks: String = "$oidcRealm/protocol/openid-connect/certs",
    val oidcScopes: List<String> = listOf("roles"),
    val jwksCache: OidcJwksCacheConfiguration =
      OidcJwksCacheConfiguration(10, 24, OidcJwksCacheConfiguration.JwksRateLimit(10, 1)),
    val authorizeUrl: String = "$oidcRealm/protocol/openid-connect/auth",
    val accessTokenUrl: String = "$oidcRealm/protocol/openid-connect/token",
    val logoutUrl: String = "$oidcRealm/protocol/openid-connect/logout",
    val clientId: String = "wallet-backend",
    val clientSecret: String = "secret",
    val keycloakUserApi: String = "$oidcRealm/protocol/openid-connect/userinfo",
) : WalletConfig()
