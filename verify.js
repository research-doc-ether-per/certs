import id.walt.openid4vci.core.CredentialStatusProviderRegistry
import id.walt.w3c.issuance.Issuer.getKidHeader
import id.walt.w3c.issuance.Issuer.mergingToVc


true -> {
    val issuanceInformation = w3cVc.mergingToVc(
        issuerId = issuerId,
        subjectDid = holderDid ?: "",
        mappings = dataMapping ?: JsonObject(emptyMap()),
        display = Json.encodeToJsonElement(display ?: emptyList()).jsonArray,
        completeJwtWithDefaultCredentialData = true,
        context = context,
    )

    val mappedVc = issuanceInformation.w3cVc

    val credentialType = mappedVc["type"]?.let { type ->
        when (type) {
            is JsonArray -> type.lastOrNull()?.jsonPrimitive?.content
            is JsonPrimitive -> type.content
            else -> null
        }
    } ?: throw IllegalStateException(
        "Credential type is required for VC Status assignment"
    )

    val dynamicCredentialStatus =
        if (CredentialStatusProviderRegistry.isRegistered()) {
            CredentialStatusProviderRegistry.provide(
                credential = JsonObject(mappedVc.toMap()),
                issuerId = issuerId,
                credentialType = credentialType,
            )
        } else {
            null
        }

    val finalCredentialStatus =
        dynamicCredentialStatus ?: credentialStatus

    val vcWithStatus = finalCredentialStatus?.let { status ->
        W3CVC(
            mappedVc.toMutableMap().apply {
                put("credentialStatus", status)
            }
        )
    } ?: mappedVc

    val issuerDid = issuerId.takeIf(DidUtils::isDidUrl)

    when (issuerSigningKey) {
        is IssuerSigningKey.Legacy -> vcWithStatus.signJws(
            issuerKey = issuerSigningKey.key,
            issuerId = issuerId,
            issuerKid = getKidHeader(
                issuerSigningKey.key,
                issuerDid,
            ),
            subjectDid = holderDid ?: "",
            additionalJwtHeader = additionalJwtHeaders,
            additionalJwtOptions = emptyMap<String, JsonElement>()
                .toMutableMap()
                .apply {
                    putAll(issuanceInformation.jwtOptions)
                },
        )

        is IssuerSigningKey.Crypto2 -> vcWithStatus.signJws(
            issuerKey = issuerSigningKey.key,
            algorithm = issuerSigningKey.algorithm,
            issuerId = issuerId,
            issuerKid = getKidHeader(
                issuerSigningKey.key,
                issuerDid,
            ),
            subjectDid = holderDid ?: "",
            additionalJwtHeader = additionalJwtHeaders,
            additionalJwtOptions = emptyMap<String, JsonElement>()
                .toMutableMap()
                .apply {
                    putAll(issuanceInformation.jwtOptions)
                },
        )
    }
}
