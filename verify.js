import id.walt.issuer2.service.VcStatusService
import kotlinx.serialization.json.*


private val vcStatusService: VcStatusService,



val credentialStatus =
    session.credentialStatus
        ?: if (vcStatusService.isEnabled()) {
            vcStatusService.buildCredentialStatus(
                issuerDid = issuerId,
                credentialType = credentialType,
                credentialId = credentialId,
            )
        } else {
            null
        }

val credentialDataWithStatus = credentialStatus?.let { status ->
    when (configuration.format) {
        CredentialFormat.JWT_VC_JSON,
        CredentialFormat.JWT_VC,
        CredentialFormat.JWT_VC_JSON_LD -> {
            JsonObject(session.credentialData.toMutableMap().apply {
                put("credentialStatus", status)
            })
        }

        CredentialFormat.SD_JWT_VC -> {
            JsonObject(session.credentialData.toMutableMap().apply {
                put("status", status)
            })
        }

        else -> session.credentialData
    }
} ?: session.credentialData
