suspend fun generateSdJwtVC(
    credentialRequest: CredentialRequest,
    credentialData: JsonObject,
    issuerId: String,
    issuerKey: Key,
    selectiveDisclosure: SDMap? = null,
    dataMapping: JsonObject? = null,
    x5Chain: List<String>? = null,
    display: List<DisplayProperties>? = null,
): String {
    val proofHeader = credentialRequest.proof?.jwt?.let { JwtUtils.parseJWTHeader(it) }
        ?: throw CredentialError(
            credentialRequest = credentialRequest,
            errorCode = CredentialErrorCode.invalid_or_missing_proof,
            message = "Proof must be JWT proof"
        )

    val holderKid = proofHeader[JWTClaims.Header.keyID]?.jsonPrimitive?.content
    val holderKey = proofHeader[JWTClaims.Header.jwk]?.jsonObject

    if (holderKey.isNullOrEmpty() && holderKid.isNullOrEmpty()) throw CredentialError(
        credentialRequest = credentialRequest,
        errorCode = CredentialErrorCode.invalid_or_missing_proof,
        message = "Proof JWT header must contain kid or jwk claim"
    )

    val holderDid =
        if (!holderKid.isNullOrEmpty() && DidUtils.isDidUrl(holderKid)) holderKid.substringBefore("#") else null

    val holderKeyJWK = JWKKey.importJWK(holderKey.toString()).getOrNull()?.exportJWKObject()
        ?.plus(JWTClaims.Header.keyID to JWKKey.importJWK(holderKey.toString()).getOrThrow().getKeyId())
        ?.toJsonObject()

    // ✅ 1️⃣ 在创建 SDPayload 之前给 credentialData 注入空数组
    val credentialDataWithStatus = credentialData.toMutableMap().apply {
        this["credentialStatus"] = buildJsonArray { } // 空数组 []
    }.let { JsonObject(it) }

    val sdPayload = SDPayload.createSDPayload(
        fullPayload = credentialDataWithStatus.mergeSDJwtVCPayloadWithMapping(
            mapping = dataMapping ?: JsonObject(emptyMap()),
            context = mapOf(
                "subjectDid" to holderDid,
                "display" to Json.encodeToJsonElement(display ?: emptyList()).jsonArray,
            ).filterValues {
                when (it) {
                    is JsonElement -> it !is JsonNull && (it !is JsonObject || it.jsonObject.isNotEmpty()) &&
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
        ),
        disclosureMap = selectiveDisclosure ?: SDMap(mapOf())
    )

    val cnf = holderDid?.let { buildJsonObject { put(JWTClaims.Header.keyID, holderDid) } }
        ?: holderKeyJWK?.let { buildJsonObject { put("jwk", holderKeyJWK) } }
        ?: throw IllegalArgumentException("Either holderKey or holderDid must be given")

    val defaultPayloadProperties = defaultPayloadProperties(
        issuerId = issuerId,
        cnf = cnf,
        vct = credentialRequest.vct
            ?: throw CredentialError(
                credentialRequest = credentialRequest,
                errorCode = CredentialErrorCode.invalid_request,
                message = "VCT must be set on credential request"
            )
    ).plus("display" to Json.encodeToJsonElement(display ?: emptyList()).jsonArray)

    val undisclosedPayload = sdPayload.undisclosedPayload.plus(defaultPayloadProperties).let { JsonObject(it) }
    val fullPayload = sdPayload.fullPayload.plus(defaultPayloadProperties).let { JsonObject(it) }

    // ✅ 2️⃣ 在 issuerDid 前注入 credentialStatus 到 fullPayload
    val fullPayloadWithStatus = fullPayload.toMutableMap().apply {
        this["credentialStatus"] = buildJsonArray { } // 空数组 []
    }.let { JsonObject(it) }

    val issuerDid = if (DidUtils.isDidUrl(issuerId)) issuerId else null

    val headers = mapOf(
        JWTClaims.Header.keyID to getKidHeader(issuerKey, issuerDid),
        JWTClaims.Header.type to SD_JWT_VC_TYPE_HEADER
    ).plus(x5Chain?.let {
        mapOf(JWTClaims.Header.x5c to JsonArray(it.map { cert -> cert.toJsonElement() }))
    } ?: mapOf())

    val finalSdPayload = SDPayload.createSDPayload(
        fullPayload = fullPayloadWithStatus,
        undisclosedPayload = undisclosedPayload
    )

    val jwt = issuerKey.signJws(
        plaintext = finalSdPayload.undisclosedPayload.toString().encodeToByteArray(),
        headers = headers.mapValues { it.value.toJsonElement() }
    )

    return SDJwtVC(
        SDJwt.createFromSignedJwt(
            signedJwt = jwt,
            sdPayload = finalSdPayload
        )
    ).toString()
}
