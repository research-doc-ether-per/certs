// waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/application/Issuer2Module.kt

package id.walt.issuer2.application

import id.walt.commons.config.ConfigManager
import id.walt.issuer2.application.openid4vci.OpenId4VciModule
import id.walt.issuer2.config.Issuer2MetadataConfig
import id.walt.issuer2.config.Issuer2ProfilesConfig
import id.walt.issuer2.config.Issuer2ServiceConfig
import id.walt.issuer2.config.VcStatusConfig
import id.walt.issuer2.controller.Issuer2ManagementController
import id.walt.issuer2.controller.OpenId4VciController
import id.walt.issuer2.notifications.IssuanceNotificationService
import id.walt.issuer2.repository.ConfiguredIssuanceSessionRepository
import id.walt.issuer2.repository.IssuanceSessionRepository
import id.walt.issuer2.repository.openid4vci.ConfiguredAuthorizationCodeRepository
import id.walt.issuer2.repository.openid4vci.ConfiguredPARRepository
import id.walt.issuer2.repository.openid4vci.ConfiguredPreAuthorizedCodeRepository
import id.walt.issuer2.repository.openid4vci.ConfiguredRefreshTokenRepository
import id.walt.issuer2.service.CredentialOfferService
import id.walt.issuer2.service.CredentialProfileService
import id.walt.issuer2.service.IssuanceSessionService
import id.walt.issuer2.service.openid4vci.CredentialProofKeyAcceptance
import id.walt.issuer2.service.openid4vci.CredentialProofKeyCommitment
import id.walt.issuer2.service.openid4vci.MetadataService
import id.walt.issuer2.service.openid4vci.OpenId4VciProtocolService
import id.walt.issuer2.service.status.VcStatusService
import id.walt.openid4vci.repository.preauthorized.PreAuthorizedCodeRepository

class Issuer2Module @JvmOverloads constructor(
    serviceConfig: Issuer2ServiceConfig,
    metadataConfig: Issuer2MetadataConfig,
    profilesConfig: Issuer2ProfilesConfig,
    vcStatusConfig: VcStatusConfig,
    credentialProofKeyAcceptance: CredentialProofKeyAcceptance? = null,
    credentialProofKeyCommitment: CredentialProofKeyCommitment? = null,
    issuanceSessionRepository: IssuanceSessionRepository = ConfiguredIssuanceSessionRepository(),
    preAuthorizedCodeRepository: PreAuthorizedCodeRepository = ConfiguredPreAuthorizedCodeRepository(),
) {
    private val authorizationCodeRepository = ConfiguredAuthorizationCodeRepository()
    private val parRepository = ConfiguredPARRepository()
    private val refreshTokenRepository = ConfiguredRefreshTokenRepository()
    private val notificationService = IssuanceNotificationService()

    private val openId4VciModule = OpenId4VciModule.create(
        config = serviceConfig,
        authorizationCodeRepository = authorizationCodeRepository,
        preAuthorizedCodeRepository = preAuthorizedCodeRepository,
        parRepository = parRepository,
        refreshTokenRepository = refreshTokenRepository,
    )

    private val credentialProfileService = CredentialProfileService(
        profilesConfig = profilesConfig,
        metadataConfig = metadataConfig,
    )

    private val issuanceSessionService = IssuanceSessionService(
        repository = issuanceSessionRepository,
    )

    private val metadataService = MetadataService(
        serviceConfig = serviceConfig,
        metadataConfig = metadataConfig,
        profileService = credentialProfileService,
        sessionService = issuanceSessionService,
        preAuthorizedGrantAnonymousAccessSupported =
            openId4VciModule.preAuthorizedCodeIssuer.anonymousAccessSupported,
        crypto2TokenSigningKey = openId4VciModule.crypto2TokenSigningKey,
    )

    private val vcStatusService = VcStatusService(
        config = vcStatusConfig,
    )

    val credentialOfferService = CredentialOfferService(
        profileService = credentialProfileService,
        sessionService = issuanceSessionService,
        preAuthorizedCodeIssuer = openId4VciModule.preAuthorizedCodeIssuer,
        config = serviceConfig,
        notificationService = notificationService,
    )

    private val protocolService = OpenId4VciProtocolService(
        oauth2Provider = openId4VciModule.oauth2Provider,
        sessionService = issuanceSessionService,
        profileService = credentialProfileService,
        metadataService = metadataService,
        notificationService = notificationService,
        credentialProofKeyAcceptance = credentialProofKeyAcceptance,
        credentialProofKeyCommitment = credentialProofKeyCommitment,
        credentialNonceService = openId4VciModule.credentialNonceService,
        vcStatusService = vcStatusService,
    )

    val managementController = Issuer2ManagementController(
        profileService = credentialProfileService,
        sessionService = issuanceSessionService,
        offerService = credentialOfferService,
    )

    val openId4VciController = OpenId4VciController(
        metadataService = metadataService,
        protocolService = protocolService,
        offerService = credentialOfferService,
        notificationService = notificationService,
    )

    companion object {
        @JvmOverloads
        fun load(
            credentialProofKeyAcceptance: CredentialProofKeyAcceptance? = null,
        ): Issuer2Module =
            Issuer2Module(
                serviceConfig = ConfigManager.getConfig(),
                metadataConfig = ConfigManager.getConfig(),
                profilesConfig = ConfigManager.getConfig(),
                vcStatusConfig = ConfigManager.getConfig(),
                credentialProofKeyAcceptance = credentialProofKeyAcceptance,
            )
    }
}

// src/main/kotlin/id/walt/issuer2/service/status/VcStatusService.kt
package id.walt.issuer2.service.status

import id.walt.issuer2.config.VcStatusConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.forms.FormDataContent
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.Parameters
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

class VcStatusService(
    private val config: VcStatusConfig,
) {
    private val json = Json {
        ignoreUnknownKeys = true
    }

    private val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(json)
        }
    }

    fun isEnabled(): Boolean = config.enabled

    suspend fun assignIndex(
        issuerDid: String,
        vcType: String,
        vcId: String,
    ): JsonObject {
        require(config.enabled) {
            "VC Status service is disabled"
        }

        val accessToken = getAccessToken()

        val path = config.api.allocatePath.replace(
            "{issuer_did}",
            issuerDid,
        )

        val url = "${config.api.baseUrl.trimEnd('/')}/${path.trimStart('/')}"

        return httpClient.post(url) {
            bearerAuth(accessToken)
            contentType(ContentType.Application.Json)

            setBody(
                AssignIndexRequest(
                    vcType = vcType,
                    vcId = vcId,
                )
            )
        }.body()
    }

    private suspend fun getAccessToken(): String {
        val response = httpClient.post(config.authentication.tokenUrl) {
            setBody(
                FormDataContent(
                    Parameters.build {
                        append("grant_type", "client_credentials")
                        append("client_id", config.authentication.clientId)

                        if (config.authentication.clientSecret.isNotBlank()) {
                            append(
                                "client_secret",
                                config.authentication.clientSecret,
                            )
                        }
                    }
                )
            )
        }.body<TokenResponse>()

        require(response.accessToken.isNotBlank()) {
            "Failed to obtain VC Status API access token"
        }

        return response.accessToken
    }

    @Serializable
    private data class AssignIndexRequest(
        @SerialName("vc_type")
        val vcType: String,

        @SerialName("vc_id")
        val vcId: String,
    )

    @Serializable
    private data class TokenResponse(
        @SerialName("access_token")
        val accessToken: String,

        @SerialName("token_type")
        val tokenType: String? = null,

        @SerialName("expires_in")
        val expiresIn: Long? = null,
    )
}


