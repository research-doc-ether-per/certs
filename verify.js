package id.walt.issuer.web.plugins

import id.walt.commons.config.ConfigManager
import id.walt.commons.web.modules.AuthenticationServiceModule
import id.walt.issuer.config.AuthenticationServiceConfig
import id.walt.issuer.config.OIDCIssuerServiceConfig
import io.ktor.client.*
import io.ktor.http.*
import io.ktor.server.auth.*

val issuerAuthenticationPluginAmendment: suspend () -> Unit = suspend {
    val authenticationServiceConfig = ConfigManager.getConfig<AuthenticationServiceConfig>()
    val issuerServiceConfig = ConfigManager.getConfig<OIDCIssuerServiceConfig>()

    AuthenticationServiceModule.AuthenticationServiceConfig.apply {
        customAuthentication = {
            // 1. 個人用 OAuth Providerer
            oauth("auth-oauth-individual") {
                client = HttpClient()
                providerLookup = {
                    OAuthServerSettings.OAuth2ServerSettings(
                        name = authenticationServiceConfig.individual.name,
                        authorizeUrl = authenticationServiceConfig.individual.authorizeUrl,
                        accessTokenUrl = authenticationServiceConfig.individual.accessTokenUrl,
                        clientId = authenticationServiceConfig.individual.clientId,
                        clientSecret = authenticationServiceConfig.individual.clientSecret,
                        requestMethod = HttpMethod.Post
                    )
                }

                urlProvider = { "${issuerServiceConfig.baseUrl}/callback" }
            }

            // 2. 組織用 OAuth Provider
            oauth("auth-oauth-corporate") {
                client = HttpClient()
                providerLookup = {
                    OAuthServerSettings.OAuth2ServerSettings(
                        name = authenticationServiceConfig.corporate.name,
                        authorizeUrl = authenticationServiceConfig.corporate.authorizeUrl,
                        accessTokenUrl = authenticationServiceConfig.corporate.accessTokenUrl,
                        clientId = authenticationServiceConfig.corporate.clientId,
                        clientSecret = authenticationServiceConfig.corporate.clientSecret,
                        requestMethod = HttpMethod.Post
                    )
                }

                urlProvider = { "${issuerServiceConfig.baseUrl}/callback" }
            }
        }
    }
}
