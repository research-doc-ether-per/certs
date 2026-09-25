package id.walt.openid4vci.handlers.credential

import id.walt.certificate.x509.X509Certificate
import id.walt.crypto.keys.Key
import id.walt.crypto.utils.Base64Utils.decodeFromBase64Url
import id.walt.crypto.utils.Base64Utils.encodeToBase64
import id.walt.crypto2.jose.JwsAlgorithm
import id.walt.crypto2.keys.Key as Crypto2Key
import id.walt.did.dids.DidUtils
import id.walt.openid4vci.core.CredentialStatusProviderRegistry
import id.walt.openid4vci.metadata.issuer.CredentialDisplay
import id.walt.openid4vci.proofs.VerifiedCredentialProof
import id.walt.openid4vci.requests.credential.CredentialRequest
import id.walt.sdjwt.SDJwtVC.Companion.SD_JWT_VC_TYPE_HEADER
import id.walt.sdjwt.SDMap
import id.walt.w3c.CredentialBuilder
import id.walt.w3c.CredentialBuilderType
import id.walt.w3c.issuance.Issuer.getKidHeader
import id.walt.w3c.issuance.Issuer.mergingToVc
import id.walt.w3c.vc.vcs.W3CV11DataModel
import id.walt.w3c.vc.vcs.W3CV2DataModel
import id.walt.w3c.vc.vcs.W3CVC
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

object W3cJwtVcCredentialSigner {

    @Deprecated("Use the Crypto2Key overload")
    suspend fun generateW3CJwtVC(
        credentialRequest: CredentialRequest,
        credentialData: JsonObject,
        issuerKey: Key,
        issuerId: String,
        selectiveDisclosure: SDMap? = null,
        dataMapping: JsonObject? = null,
        x5Chain: List<X509Certificate>? = null,
        display: List<CredentialDisplay>? = null,
        credentialStatus: JsonElement? = null,
        w3cVersion: String? = null,
        verifiedProof: VerifiedCredentialProof? = null,
    ): String = generateW3CJwtVC(
        credentialRequest = credentialRequest,
        credentialData = credentialData,
        issuerSigningKey = IssuerSigningKey.Legacy(issuerKey),
        issuerId = issuerId,
        selectiveDisclosure = selectiveDisclosure,
        dataMapping = dataMapping,
        x5Chain = x5Chain,
        display = display,
        credentialStatus = credentialStatus,
        w3cVersion = w3cVersion,
        verifiedProof = verifiedProof,
    )

    suspend fun generateW3CJwtVC(
        credentialRequest: CredentialRequest,
        credentialData: JsonObject,
        issuerKey: Crypto2Key,
        algorithm: JwsAlgorithm,
        issuerId: String,
        selectiveDisclosure: SDMap? = null,
        dataMapping: JsonObject? = null,
        x5Chain: List<X509Certificate>? = null,
        display: List<CredentialDisplay>? = null,
        credentialStatus: JsonElement? = null,
        w3cVersion: String? = null,
        verifiedProof: VerifiedCredentialProof? = null,
    ): String = generateW3CJwtVC(
        credentialRequest = credentialRequest,
        credentialData = credentialData,
        issuerSigningKey = IssuerSigningKey.Crypto2(
            issuerKey,
            algorithm,
        ),
        issuerId = issuerId,
        selectiveDisclosure = selectiveDisclosure,
        dataMapping = dataMapping,
        x5Chain = x5Chain,
        display = display,
        credentialStatus = credentialStatus,
        w3cVersion = w3cVersion,
        verifiedProof = verifiedProof,
    )

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
        val proofHeader =
            verifiedProof?.header
                ?: credentialRequest.proofs?.jwt?.let {
                    JwtUtils.parseJWTHeader(it.first())
                }
                ?: throw IllegalArgumentException(
                    "Missing JWT proof in proofs"
                )

        val holderKid =
            verifiedProof?.holderKid
                ?: proofHeader[JWT_HEADER_KID]
                    ?.jsonPrimitive
                    ?.content

        val holderDid =
            verifiedProof?.holderDid
                ?: if (
                    !holderKid.isNullOrEmpty() &&
                    DidUtils.isDidUrl(holderKid)
                ) {
                    holderKid.substringBefore("#")
                } else {
                    null
                }

        val additionalJwtHeaders =
            x5Chain?.let {
                mapOf(
                    JWT_HEADER_X5C to JsonArray(
                        it.map { cert ->
                            JsonPrimitive(
                                cert.encodedDer
                                    .toByteArray()
                                    .encodeToBase64()
                            )
                        }
                    )
                )
            } ?: mapOf()

        val vcPayload =
            credentialStatus?.let { status ->
                JsonObject(
                    credentialData
                        .toMutableMap()
                        .apply {
                            put(
                                "credentialStatus",
                                status,
                            )
                        }
                )
            } ?: credentialData

        return W3CVC(vcPayload).let { vc ->

            val builderType =
                w3cVersion?.let { version ->
                    val serialNameMap =
                        mapOf(
                            "W3CV11" to
                                CredentialBuilderType.W3CV11CredentialBuilder,
                            "W3CV2" to
                                CredentialBuilderType.W3CV2CredentialBuilder,
                        )

                    CredentialBuilderType.entries
                        .firstOrNull {
                            it.name == version
                        }
                        ?: serialNameMap[version]
                        ?: CredentialBuilderType.entries
                            .firstOrNull {
                                it.name.equals(
                                    version,
                                    ignoreCase = true,
                                )
                            }
                        ?: serialNameMap.entries
                            .firstOrNull {
                                it.key.equals(
                                    version,
                                    ignoreCase = true,
                                )
                            }
                            ?.value
                        ?: throw IllegalArgumentException(
                            "Unsupported w3cVersion: '$version'. " +
                                "Supported values: ${
                                    (
                                        CredentialBuilderType.entries
                                            .map { it.name } +
                                            serialNameMap.keys
                                        )
                                        .joinToString {
                                            "'$it'"
                                        }
                                }"
                        )
                }

            val w3cVc =
                when (builderType) {
                    CredentialBuilderType.W3CV2CredentialBuilder -> {
                        val v2ContextUri =
                            W3CV2DataModel.defaultContext.first()

                        val v11ContextUri =
                            W3CV11DataModel.defaultContext.first()

                        val base =
                            if (vc.isV2()) {
                                vc.toMutableMap()
                            } else {
                                val existing =
                                    vcPayload["@context"]
                                        ?.let {
                                            if (it is JsonArray) {
                                                it.map { e ->
                                                    e.jsonPrimitive.content
                                                }
                                            } else {
                                                listOf(
                                                    it.jsonPrimitive.content
                                                )
                                            }
                                        }
                                        ?: emptyList()

                                val merged =
                                    (
                                        listOf(v2ContextUri) +
                                            existing
                                        )
                                        .distinct()

                                vcPayload
                                    .toMutableMap()
                                    .also { map ->
                                        map["@context"] =
                                            JsonArray(
                                                merged.map {
                                                    JsonPrimitive(it)
                                                }
                                            )
                                    }
                            }

                        (base["@context"] as? JsonArray)
                            ?.let { arr ->
                                val cleaned =
                                    arr.filter {
                                        it.jsonPrimitive
                                            .contentOrNull !=
                                            v11ContextUri
                                    }

                                if (cleaned.size != arr.size) {
                                    base["@context"] =
                                        JsonArray(cleaned)
                                }
                            }

                        base.remove("issuanceDate")
                            ?.let { value ->
                                if ("validFrom" !in base) {
                                    base["validFrom"] = value
                                }
                            }

                        base.remove("expirationDate")
                            ?.let { value ->
                                if ("validUntil" !in base) {
                                    base["validUntil"] = value
                                }
                            }

                        W3CVC(base)
                    }

                    else ->
                        builderType?.let {
                            val builder =
                                CredentialBuilder(it)

                            builder.useCredentialSubject(
                                vcPayload
                            )

                            builder.buildW3C()
                        } ?: vc
                }

            val context =
                mapOf(
                    "subjectDid" to holderDid,
                    "issuerDid" to issuerId,
                    "issuerId" to issuerId,
                    "display" to
                        Json.encodeToJsonElement(
                            display ?: emptyList()
                        ).jsonArray,
                )
                    .filterValues {
                        when (it) {
                            is JsonElement ->
                                it !is JsonNull &&
                                    (
                                        it !is JsonObject ||
                                            it.isNotEmpty()
                                        ) &&
                                    (
                                        it !is JsonArray ||
                                            it.isNotEmpty()
                                        )

                            else ->
                                it != null &&
                                    it.toString()
                                        .isNotEmpty()
                        }
                    }
                    .mapValues { (_, value) ->
                        when (value) {
                            is JsonElement ->
                                value

                            else ->
                                JsonPrimitive(
                                    value.toString()
                                )
                        }
                    }

            /*
             * Apply data mapping before VC Status assignment.
             *
             * The credential ID generated by dataMapping must be finalized
             * before calling the VC Status service.
             */
            val issuanceInformation =
                w3cVc.mergingToVc(
                    issuerId = issuerId,
                    subjectDid = holderDid ?: "",
                    mappings =
                        dataMapping
                            ?: JsonObject(emptyMap()),
                    display =
                        Json.encodeToJsonElement(
                            display ?: emptyList()
                        ).jsonArray,
                    completeJwtWithDefaultCredentialData =
                        true,
                    context = context,
                )

            val mappedVc =
                issuanceInformation.w3cVc

            /*
             * Use the last VC type as the business credential type.
             *
             * Example:
             * [
             *   "VerifiableCredential",
             *   "EmployeeCredential"
             * ]
             *
             * -> EmployeeCredential
             */
            val credentialType =
                getCredentialType(mappedVc)

            /*
             * Allocate VC Status after data mapping.
             *
             * At this point mappedVc already contains the final
             * credential ID.
             */
            val dynamicCredentialStatus =
                if (
                    CredentialStatusProviderRegistry
                        .isRegistered()
                ) {
                    val type =
                        credentialType
                            ?: throw IllegalStateException(
                                "Credential type is required " +
                                    "for VC Status assignment"
                            )

                    CredentialStatusProviderRegistry
                        .provide(
                            credential = JsonObject(
                                mappedVc.toMap()
                            ),
                            issuerId = issuerId,
                            credentialType = type,
                        )
                } else {
                    null
                }

            /*
             * Dynamic VC Status takes precedence over the
             * statically configured credentialStatus.
             */
            val finalCredentialStatus =
                dynamicCredentialStatus
                    ?: credentialStatus

            /*
             * Add credentialStatus before signing.
             */
            val vcWithStatus =
                finalCredentialStatus?.let { status ->
                    W3CVC(
                        mappedVc
                            .toMutableMap()
                            .apply {
                                put(
                                    "credentialStatus",
                                    status,
                                )
                            }
                    )
                } ?: mappedVc

            val issuerDid =
                issuerId.takeIf(
                    DidUtils::isDidUrl
                )

            /*
             * Mapping and VC Status processing are common to
             * Legacy and Crypto2.
             *
             * Only the final signing implementation differs.
             */
            when (
                selectiveDisclosure.isNullOrEmpty()
            ) {
                true ->
                    when (issuerSigningKey) {
                        is IssuerSigningKey.Legacy ->
                            vcWithStatus.signJws(
                                issuerKey =
                                    issuerSigningKey.key,
                                issuerId = issuerId,
                                issuerKid =
                                    getKidHeader(
                                        issuerSigningKey.key,
                                        issuerDid,
                                    ),
                                subjectDid =
                                    holderDid ?: "",
                                additionalJwtHeader =
                                    additionalJwtHeaders,
                                additionalJwtOptions =
                                    emptyMap<String, JsonElement>()
                                        .toMutableMap()
                                        .apply {
                                            putAll(
                                                issuanceInformation
                                                    .jwtOptions
                                            )
                                        },
                            )

                        is IssuerSigningKey.Crypto2 ->
                            vcWithStatus.signJws(
                                issuerKey =
                                    issuerSigningKey.key,
                                algorithm =
                                    issuerSigningKey.algorithm,
                                issuerId = issuerId,
                                issuerKid =
                                    getKidHeader(
                                        issuerSigningKey.key,
                                        issuerDid,
                                    ),
                                subjectDid =
                                    holderDid ?: "",
                                additionalJwtHeader =
                                    additionalJwtHeaders,
                                additionalJwtOptions =
                                    emptyMap<String, JsonElement>()
                                        .toMutableMap()
                                        .apply {
                                            putAll(
                                                issuanceInformation
                                                    .jwtOptions
                                            )
                                        },
                            )
                    }

                else -> {
                    val type =
                        when (builderType) {
                            CredentialBuilderType.W3CV2CredentialBuilder ->
                                SD_JWT_VC_TYPE_HEADER

                            else ->
                                "JWT"
                        }

                    when (issuerSigningKey) {
                        is IssuerSigningKey.Legacy ->
                            vcWithStatus.signSdJwt(
                                issuerKey =
                                    issuerSigningKey.key,
                                issuerId = issuerId,
                                issuerKid =
                                    getKidHeader(
                                        issuerSigningKey.key,
                                        issuerDid,
                                    ),
                                subjectDid =
                                    holderDid ?: "",
                                disclosureMap =
                                    selectiveDisclosure,
                                additionalJwtHeaders =
                                    additionalJwtHeaders
                                        .toMutableMap()
                                        .apply {
                                            put(
                                                "typ",
                                                JsonPrimitive(
                                                    type
                                                ),
                                            )
                                        },
                                additionalJwtOptions =
                                    emptyMap<String, JsonElement>()
                                        .toMutableMap()
                                        .apply {
                                            putAll(
                                                issuanceInformation
                                                    .jwtOptions
                                            )
                                        },
                            )

                        is IssuerSigningKey.Crypto2 ->
                            vcWithStatus.signSdJwt(
                                issuerKey =
                                    issuerSigningKey.key,
                                algorithm =
                                    issuerSigningKey.algorithm,
                                issuerId = issuerId,
                                issuerKid =
                                    getKidHeader(
                                        issuerSigningKey.key,
                                        issuerDid,
                                    ),
                                subjectDid =
                                    holderDid ?: "",
                                disclosureMap =
                                    selectiveDisclosure,
                                additionalJwtHeaders =
                                    additionalJwtHeaders +
                                        (
                                            "typ" to
                                                JsonPrimitive(
                                                    type
                                                )
                                            ),
                                additionalJwtOptions =
                                    emptyMap<String, JsonElement>() +
                                        issuanceInformation
                                            .jwtOptions,
                            )
                    }
                }
            }
        }
    }

    private fun getCredentialType(
        credential: W3CVC,
    ): String? {
        val type =
            credential["type"]
                ?: return null

        return when (type) {
            is JsonArray ->
                type
                    .lastOrNull()
                    ?.jsonPrimitive
                    ?.contentOrNull

            is JsonPrimitive ->
                type.contentOrNull

            else ->
                null
        }
    }

    private sealed interface IssuerSigningKey {

        data class Legacy(
            val key: Key,
        ) : IssuerSigningKey

        data class Crypto2(
            val key: Crypto2Key,
            val algorithm: JwsAlgorithm,
        ) : IssuerSigningKey
    }

    private const val JWT_HEADER_KID =
        "kid"

    private const val JWT_HEADER_X5C =
        "x5c"
}


object JwtUtils {

    fun parseJWTPayload(
        token: String,
    ): JsonObject {
        return token
            .substringAfter(".")
            .substringBefore(".")
            .let {
                Json.decodeFromString(
                    it.decodeFromBase64Url()
                        .decodeToString()
                )
            }
    }

    fun parseJWTHeader(
        token: String,
    ): JsonObject {
        return token
            .substringBefore(".")
            .let {
                Json.decodeFromString(
                    it.decodeFromBase64Url()
                        .decodeToString()
                )
            }
    }
}
