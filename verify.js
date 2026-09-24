val credentialId = session.credentialData["id"]
    ?.jsonPrimitive
    ?.content
    ?: throw IllegalStateException(
        "Credential id is required for VC Status assignment"
    )

val credentialType = session.credentialData["type"]?.let { type ->
    when (type) {
        is JsonArray -> type.lastOrNull()
            ?.jsonPrimitive
            ?.content

        is JsonPrimitive -> type.content

        else -> null
    }
} ?: throw IllegalStateException(
    "Credential type is required for VC Status assignment"
)

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
