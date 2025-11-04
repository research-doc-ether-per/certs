// RevocationPolicy.kt
package id.walt.policies.policies

import id.walt.policies.policies.status.StatusPolicyImplementation.verifyWithAttributes
import id.walt.policies.policies.status.Values
import id.walt.policies.policies.status.model.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import love.forte.plugin.suspendtrans.annotation.JvmAsync
import love.forte.plugin.suspendtrans.annotation.JvmBlocking

@Serializable
actual class RevocationPolicy : RevocationPolicyMp() {

    @Transient
    private val defaultAttribute = W3CStatusPolicyAttribute(
        value = 0u,
        purpose = "revocation",
        type = Values.BITSTRING_STATUS_LIST_ENTRY
    )

    @Transient
    private val defaultAttributeOfJWT = W3CStatusPolicyAttribute(
        value = 0u,
        purpose = "revocation",
        type = Values.TOKEN_STATUS_LIST
    )

    @JvmBlocking
    @JvmAsync
    actual override suspend fun verify(
        data: JsonObject,
        args: Any?,
        context: Map<String, Any>
    ): Result<Any> {
        val credentialStatusNode = findCredentialStatusNodeExtended(data)
            ?: return Result.failure(IllegalArgumentException("credentialStatus not found in VC"))

        return when (credentialStatusNode.origin) {
            // 只有 status.status_list / vc.status.status_list 才走 TOKEN_STATUS_LIST
            CredentialStatusOrigin.TOKEN_LIST -> verifyWithAttributes(data, defaultAttributeOfJWT)

            // W3C 形态：credentialStatus 必为 object 或 array
            CredentialStatusOrigin.W3C -> when (val el = credentialStatusNode.node) {
                is JsonObject -> verifyWithAttributes(data, defaultAttribute)
                is JsonArray  -> {
                    val attributes = List(el.size) { defaultAttribute }
                    verifyWithAttributes(data, W3CStatusPolicyListArguments(attributes))
                }
                else -> Result.failure(IllegalArgumentException("Invalid credentialStatus structure: expected object or array"))
            }
        }
    }

    // ---- helpers ----

    private enum class CredentialStatusOrigin { W3C, TOKEN_LIST }

    private data class CredentialStatusNode(val node: JsonElement, val origin: CredentialStatusOrigin)

    /**
     * 支持四种位置：
     * 1) vc["credentialStatus"]
     * 2) vc["vc"].credentialStatus
     * 3) vc["vc"].status.status_list
     * 4) vc["status"].status_list
     */
    private fun findCredentialStatusNodeExtended(vc: JsonObject): CredentialStatusNode? {
        vc["credentialStatus"]?.let { return CredentialStatusNode(it, CredentialStatusOrigin.W3C) }

        (vc["vc"] as? JsonObject)?.get("credentialStatus")?.let {
            return CredentialStatusNode(it, CredentialStatusOrigin.W3C)
        }

        val vcInner = vc["vc"] as? JsonObject
        (vcInner?.get("status") as? JsonObject)?.get("status_list")?.let {
            return CredentialStatusNode(it, CredentialStatusOrigin.TOKEN_LIST)
        }

        (vc["status"] as? JsonObject)?.get("status_list")?.let {
            return CredentialStatusNode(it, CredentialStatusOrigin.TOKEN_LIST)
        }

        return null
    }
}
