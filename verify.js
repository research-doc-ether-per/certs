import id.walt.openid4vci.core.CredentialStatusProviderRegistry



val mappedCredentialData = credentialData.mergeSDJwtVCPayloadWithMapping(
    mapping = dataMapping ?: JsonObject(emptyMap()),
    context = mapOf(
        "subjectDid" to holderDid,
        "issuerDid" to issuerId,
        "issuerId" to issuerId,
        "display" to Json.encodeToJsonElement(display ?: emptyList()).jsonArray,
    ).filterValues {
        when (it) {
            is JsonElement -> it !is JsonNull &&
                (it !is JsonObject || it.jsonObject.isNotEmpty()) &&
                (it !is JsonArray || it.jsonArray.isNotEmpty())

            else -> it.toString().isNotEmpty()
        }
    }.mapValues { (_, value) ->
        when (value) {
            is JsonElement -> value
            else -> JsonPrimitive(value.toString())
        }
    },
    data = dataFunctions
)

val dynamicCredentialStatus = CredentialStatusProviderRegistry.provide(
    credential = mappedCredentialData,
    issuerId = issuerId,
    credentialType = vct,
)

val credentialDataWithStatus = dynamicCredentialStatus?.let { status ->
    JsonObject(
        mappedCredentialData.toMutableMap().apply {
            put("status", status)
        }
    )
} ?: mappedCredentialData

val sdPayload = SDPayload.createSDPayload(
    fullPayload = credentialDataWithStatus,
    disclosureMap = selectiveDisclosure ?: SDMap(mapOf())
)
