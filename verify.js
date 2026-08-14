package id.walt.issuer.config

import id.walt.commons.config.WaltConfig
import kotlinx.serialization.Serializable

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
) : WaltConfig()
