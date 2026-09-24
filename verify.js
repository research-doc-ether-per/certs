// vc-status.conf
enabled = true

api {
    baseUrl = "http://10.0.2.15:6005"
    allocatePath = "/admin/issuers/{issuer_did}/bsl/assignIndex"
}

authentication {
    tokenUrl = "http://10.0.2.15:8580/realms/groupCertAuth/protocol/openid-connect/token"
    clientId = "vc-registry-api"
    clientSecret = ""
}


// waltid-services/waltid-issuer-api2/
// └─ src/main/kotlin/id/walt/issuer2/config/
//    └─ VcStatusConfig.kt


package id.walt.issuer2.config

import id.walt.commons.config.WaltConfig

data class VcStatusConfig(
    val enabled: Boolean = false,
    val api: VcStatusApiConfig,
    val authentication: VcStatusAuthenticationConfig,
) : WaltConfig()

data class VcStatusApiConfig(
    val baseUrl: String,
    val allocatePath: String,
)

data class VcStatusAuthenticationConfig(
    val tokenUrl: String,
    val clientId: String,
    val clientSecret: String = "",
)


  // Issuer2Module.kt

  import id.walt.issuer2.config.VcStatusConfig

  class Issuer2Module @JvmOverloads constructor(
    serviceConfig: Issuer2ServiceConfig,
    metadataConfig: Issuer2MetadataConfig,
    profilesConfig: Issuer2ProfilesConfig,
    vcStatusConfig: VcStatusConfig,
    credentialProofKeyAcceptance: CredentialProofKeyAcceptance? = null,
    credentialProofKeyCommitment: CredentialProofKeyCommitment? = null,
    issuanceSessionRepository: IssuanceSessionRepository = ConfiguredIssuanceSessionRepository(),
    preAuthorizedCodeRepository: PreAuthorizedCodeRepository = ConfiguredPreAuthorizedCodeRepository(),
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
