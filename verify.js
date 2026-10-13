package id.walt.issuer2.web.plugins

import id.walt.commons.config.ConfigManager
import id.walt.commons.web.modules.AuthenticationServiceModule
import id.walt.issuer2.config.AuthenticationServiceConfig
import id.walt.issuer2.config.Issuer2ServiceConfig
import id.walt.issuer2.config.OAuthConfig
import id.walt.issuer2.service.openid4vci.decodeExternalLoginAuthorizationParameters
import io.klogging.noCoLogger
import io.ktor.client.HttpClient
import io.ktor.http.HttpMethod
import io.ktor.http.URLBuilder
import io.ktor.server.auth.OAuthServerSettings
import io.ktor.server.auth.oauth
import io.ktor.server.request.ApplicationRequest
import io.ktor.server.request.path

val issuer2AuthenticationPluginAmendment: suspend () -> Unit = suspend {
    val authenticationServiceConfig = ConfigManager.getConfig<AuthenticationServiceConfig>()
    val issuerServiceConfig = ConfigManager.getConfig<Issuer2ServiceConfig>()

    AuthenticationServiceModule.AuthenticationServiceConfig.apply {
        customAuthentication = {

            // 個人向け認証
            oauth("auth-oauth-individual") {
                client = HttpClient()
                providerLookup = {
                    createOAuthSettings(
                        config = authenticationServiceConfig.individual,
                    )
                }
                urlProvider = {
                    "${issuerServiceConfig.openId4VciBaseUrl()}/external/individual/oauth/callback"
                }
            }

            // 法人向け認証
            oauth("auth-oauth-corporate") {
                client = HttpClient()
                providerLookup = {
                    createOAuthSettings(
                        config = authenticationServiceConfig.corporate,
                    )
                }
                urlProvider = {
                    "${issuerServiceConfig.openId4VciBaseUrl()}/external/corporate/oauth/callback"
                }
            }
        }
    }
}

private fun createOAuthSettings(
    config: OAuthConfig,
): OAuthServerSettings.OAuth2ServerSettings =
    OAuthServerSettings.OAuth2ServerSettings(
        name = config.name,
        authorizeUrl = config.authorizeUrl,
        accessTokenUrl = config.accessTokenUrl,
        clientId = config.clientId,
        clientSecret = config.clientSecret,
        defaultScopes = config.defaultScopes,
        requestMethod = HttpMethod.Post,
        authorizeUrlInterceptor = { request ->
            if (config.forwardIssuerStateToAuthorizationServer) {
                appendForwardedIssuerState(request)
            }
        },
    )

private const val FORWARDED_ISSUER_STATE_PARAMETER = "issuer_state"
private const val EXTERNAL_LOGIN_PATH_SEGMENT = "/external_login/"

private val logger = noCoLogger("ExternalLoginProvider")

private fun URLBuilder.appendForwardedIssuerState(request: ApplicationRequest) {
    if (parameters[FORWARDED_ISSUER_STATE_PARAMETER] != null) {
        logger.trace("Skipping forwarded issuer state append: parameter already present")
        return
    }

    val requestPath = request.path()

    if (!requestPath.contains(EXTERNAL_LOGIN_PATH_SEGMENT)) {
        logger.trace("Skipping forwarded issuer state append: external login path segment not found")
        return
    }

    val internalAuthReq = requestPath.substringAfterLast("/")

    if (internalAuthReq.isBlank()) {
        logger.debug("Skipping forwarded issuer state append: internal auth request segment is blank")
        return
    }

    val issuerStateValues = try {
        internalAuthReq
            .decodeExternalLoginAuthorizationParameters()[FORWARDED_ISSUER_STATE_PARAMETER]
    } catch (e: Exception) {
        logger.error("Failed to extract forwarded issuer state from internal auth request", e)
        return
    }

    if (issuerStateValues == null) {
        logger.trace("Skipping forwarded issuer state append: parameter not found")
        return
    }

    if (issuerStateValues.size != 1) {
        logger.warn(
            "Skipping forwarded issuer state append: expected exactly 1 value, got ${issuerStateValues.size}"
        )
        return
    }

    val issuerState = issuerStateValues.single()

    if (issuerState.isBlank()) {
        logger.warn("Skipping forwarded issuer state append: value is blank")
        return
    }

    try {
        parameters.append(
            FORWARDED_ISSUER_STATE_PARAMETER,
            issuerState,
        )
        logger.info("Appended forwarded issuer state parameter")
    } catch (e: Exception) {
        logger.error("Failed to append forwarded issuer state parameter", e)
    }
}
