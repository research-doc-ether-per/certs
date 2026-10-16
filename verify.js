
private suspend fun generateW3CJwtVC(
    credentialRequest: CredentialRequest,
    credentialData: JsonObject,
    issuerSigningKey: IssuerSigningKey,
    issuerId: String,
    selectiveDisclosure: SDMap?,
    dataMapping: JsonObject?,
    x5Chain: List<X509Certificate>?,
    display: List<CredentialDisplay>?,
    credentialStatus: JsonElement?,
    w3cVersion: String?,
    verifiedProof: VerifiedCredentialProof?,
): String {
    println("[DEBUG] ===== generateW3CJwtVC START =====")

    try {
        // 1. Proof情報の取得
        println("[DEBUG] ===== STEP 1: Proof =====")

        val proofHeader = verifiedProof?.header
            ?: credentialRequest.proofs?.jwt?.let {
                JwtUtils.parseJWTHeader(it.first())
            }
            ?: throw IllegalArgumentException("Missing JWT proof in proofs")

        val holderKid = verifiedProof?.holderKid
            ?: proofHeader[JWT_HEADER_KID]?.jsonPrimitive?.content

        val holderDid = verifiedProof?.holderDid
            ?: if (!holderKid.isNullOrEmpty() && DidUtils.isDidUrl(holderKid)) {
                holderKid.substringBefore("#")
            } else {
                null
            }

        println("[DEBUG] holderKid = $holderKid")
        println("[DEBUG] holderDid = $holderDid")
        println("[DEBUG] issuerId = $issuerId")

        val additionalJwtHeaders = x5Chain?.let {
            mapOf(
                JWT_HEADER_X5C to JsonArray(
                    it.map { cert ->
                        JsonPrimitive(
                            cert.encodedDer.toByteArray().encodeToBase64()
                        )
                    }
                )
            )
        } ?: mapOf()

        // 2. Credential Payloadの生成
        println("[DEBUG] ===== STEP 2: Credential Payload =====")

        println("[DEBUG] credentialStatus param = $credentialStatus")
        println("[DEBUG] credentialData.status = ${credentialData["credentialStatus"]}")
        println("[DEBUG] dataMapping.status = ${dataMapping?.get("credentialStatus")}")

        val vcPayload = credentialStatus?.let { status ->
            JsonObject(
                credentialData.toMutableMap().apply {
                    put("credentialStatus", status)
                }
            )
        } ?: credentialData

        println("[DEBUG] vcPayload.status = ${vcPayload["credentialStatus"]}")
        println("[DEBUG] vcPayload.id = ${vcPayload["id"]}")

        return W3CVC(vcPayload).let { vc ->

            // 3. Credential Builderの選択
            println("[DEBUG] ===== STEP 3: Credential Builder =====")
            println("[DEBUG] w3cVersion = $w3cVersion")

            val builderType = w3cVersion?.let { version ->
                val serialNameMap = mapOf(
                    "W3CV11" to CredentialBuilderType.W3CV11CredentialBuilder,
                    "W3CV2" to CredentialBuilderType.W3CV2CredentialBuilder,
                )

                CredentialBuilderType.entries.firstOrNull {
                    it.name == version
                }
                    ?: serialNameMap[version]
                    ?: CredentialBuilderType.entries.firstOrNull {
                        it.name.equals(version, ignoreCase = true)
                    }
                    ?: serialNameMap.entries.firstOrNull {
                        it.key.equals(version, ignoreCase = true)
                    }?.value
                    ?: throw IllegalArgumentException(
                        "Unsupported w3cVersion: '$version'. Supported values: ${
                            (CredentialBuilderType.entries.map { it.name } + serialNameMap.keys)
                                .joinToString { "'$it'" }
                        }"
                    )
            }

            println("[DEBUG] builderType = $builderType")

            val w3cVc = when (builderType) {
                CredentialBuilderType.W3CV2CredentialBuilder -> {
                    val v2ContextUri = W3CV2DataModel.defaultContext.first()
                    val v11ContextUri = W3CV11DataModel.defaultContext.first()

                    val base = if (vc.isV2()) {
                        vc.toMutableMap()
                    } else {
                        val existing = vcPayload["@context"]?.let {
                            if (it is JsonArray) {
                                it.map { e -> e.jsonPrimitive.content }
                            } else {
                                listOf(it.jsonPrimitive.content)
                            }
                        } ?: emptyList()

                        val merged = (listOf(v2ContextUri) + existing).distinct()

                        vcPayload.toMutableMap().also { map ->
                            map["@context"] = JsonArray(
                                merged.map { JsonPrimitive(it) }
                            )
                        }
                    }

                    (base["@context"] as? JsonArray)?.let { arr ->
                        val cleaned = arr.filter {
                            it.jsonPrimitive.contentOrNull != v11ContextUri
                        }

                        if (cleaned.size != arr.size) {
                            base["@context"] = JsonArray(cleaned)
                        }
                    }

                    base.remove("issuanceDate")?.let { value ->
                        if ("validFrom" !in base) {
                            base["validFrom"] = value
                        }
                    }

                    base.remove("expirationDate")?.let { value ->
                        if ("validUntil" !in base) {
                            base["validUntil"] = value
                        }
                    }

                    W3CVC(base)
                }

                else -> builderType?.let {
                    val builder = CredentialBuilder(it)
                    builder.useCredentialSubject(vcPayload)
                    builder.buildW3C()
                } ?: vc
            }

            println("[DEBUG] w3cVc.id = ${w3cVc["id"]}")
            println("[DEBUG] w3cVc.type = ${w3cVc["type"]}")
            println("[DEBUG] w3cVc.status = ${w3cVc["credentialStatus"]}")

            // 4. Data Functions Contextの生成
            println("[DEBUG] ===== STEP 4: Context =====")

            val context = mapOf(
                "subjectDid" to holderDid,
                "issuerDid" to issuerId,
                "issuerId" to issuerId,
                "display" to Json.encodeToJsonElement(
                    display ?: emptyList()
                ).jsonArray,
            ).filterValues {
                when (it) {
                    is JsonElement ->
                        it !is JsonNull &&
                            (it !is JsonObject || it.isNotEmpty()) &&
                            (it !is JsonArray || it.isNotEmpty())

                    else -> it != null && it.toString().isNotEmpty()
                }
            }.mapValues { (_, value) ->
                when (value) {
                    is JsonElement -> value
                    else -> JsonPrimitive(value.toString())
                }
            }

            println("[DEBUG] context keys = ${context.keys}")
            println("[DEBUG] mapping keys = ${dataMapping?.keys}")
            println("[DEBUG] mapping.status = ${dataMapping?.get("credentialStatus")}")

            // 5. Credential署名
            println("[DEBUG] ===== STEP 5: Credential Signing =====")
            println("[DEBUG] signingKey = ${issuerSigningKey::class.simpleName}")
            println("[DEBUG] selectiveDisclosure enabled = ${!selectiveDisclosure.isNullOrEmpty()}")
            println("[DEBUG] status before mapping = ${w3cVc["credentialStatus"]}")

            val signedCredential = when (selectiveDisclosure.isNullOrEmpty()) {

                true -> {
                    println("[DEBUG] Signing format = JWT VC")

                    when (issuerSigningKey) {
                        is IssuerSigningKey.Legacy -> {
                            println("[DEBUG] signingKey = Legacy")

                            w3cVc.mergingJwtIssue(
                                issuerKey = issuerSigningKey.key,
                                issuerId = issuerId,
                                subjectDid = holderDid ?: "",
                                mappings = dataMapping ?: JsonObject(emptyMap()),
                                additionalJwtHeader = additionalJwtHeaders,
                                display = Json.encodeToJsonElement(
                                    display ?: emptyList()
                                ).jsonArray,
                                additionalJwtOptions = emptyMap(),
                                context = context,
                            )
                        }

                        is IssuerSigningKey.Crypto2 -> {
                            println("[DEBUG] signingKey = Crypto2")

                            w3cVc.mergingJwtIssue(
                                issuerKey = issuerSigningKey.key,
                                algorithm = issuerSigningKey.algorithm,
                                issuerId = issuerId,
                                subjectDid = holderDid ?: "",
                                mappings = dataMapping ?: JsonObject(emptyMap()),
                                additionalJwtHeader = additionalJwtHeaders,
                                display = Json.encodeToJsonElement(
                                    display ?: emptyList()
                                ).jsonArray,
                                additionalJwtOptions = emptyMap(),
                                context = context,
                            )
                        }
                    }
                }

                else -> {
                    println("[DEBUG] Signing format = SD-JWT VC")

                    val type = when (builderType) {
                        CredentialBuilderType.W3CV2CredentialBuilder ->
                            SD_JWT_VC_TYPE_HEADER

                        else -> "JWT"
                    }

                    println("[DEBUG] SD-JWT typ = $type")

                    when (issuerSigningKey) {
                        is IssuerSigningKey.Legacy -> {
                            println("[DEBUG] signingKey = Legacy")

                            w3cVc.mergingSdJwtIssue(
                                issuerKey = issuerSigningKey.key,
                                issuerId = issuerId,
                                subjectDid = holderDid ?: "",
                                mappings = dataMapping ?: JsonObject(emptyMap()),
                                additionalJwtHeaders = additionalJwtHeaders,
                                additionalJwtOptions = emptyMap(),
                                display = Json.encodeToJsonElement(
                                    display ?: emptyList()
                                ).jsonArray,
                                disclosureMap = selectiveDisclosure,
                                context = context,
                                type = type,
                            )
                        }

                        is IssuerSigningKey.Crypto2 -> {
                            println("[DEBUG] signingKey = Crypto2")

                            w3cVc.mergingSdJwtIssue(
                                issuerKey = issuerSigningKey.key,
                                algorithm = issuerSigningKey.algorithm,
                                issuerId = issuerId,
                                subjectDid = holderDid ?: "",
                                mappings = dataMapping ?: JsonObject(emptyMap()),
                                additionalJwtHeaders = additionalJwtHeaders,
                                additionalJwtOptions = emptyMap(),
                                display = Json.encodeToJsonElement(
                                    display ?: emptyList()
                                ).jsonArray,
                                disclosureMap = selectiveDisclosure,
                                context = context,
                                type = type,
                            )
                        }
                    }
                }
            }

            // 6. 署名結果の確認
            println("[DEBUG] ===== STEP 6: Signing Result =====")
            println("[DEBUG] signedCredential length = ${signedCredential.length}")
            println("[DEBUG] Credential signing SUCCESS")

            signedCredential
        }
    } catch (e: Exception) {
        println("[ERROR] ===== generateW3CJwtVC FAILED =====")
        println("[ERROR] exception type = ${e::class.simpleName}")
        println("[ERROR] exception message = ${e.message}")
        e.printStackTrace()
        throw e
    } finally {
        println("[DEBUG] ===== generateW3CJwtVC END =====")
    }
}
