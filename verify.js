package id.walt.policies.policies

import id.walt.policies.policies.status.StatusPolicyImplementation.verifyWithAttributes
import id.walt.policies.policies.status.Values
import id.walt.policies.policies.status.model.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient
import kotlinx.serialization.json.*
import love.forte.plugin.suspendtrans.annotation.JvmAsync
import love.forte.plugin.suspendtrans.annotation.JvmBlocking

@Serializable
actual class RevocationPolicy : RevocationPolicyMp() {

    @Transient
    private val defaultAttribute = W3CStatusPolicyAttribute(
        value = 0u,
        purpose = "revocation",
        type = Values.STATUS_LIST_2021
    )

    @Transient
    private val defaultAttributeOfJWT = W3CStatusPolicyAttribute(
        value = 0u,
        purpose = "revocation",
        type = Values.TOKEN_STATUS_LIST
    )

    private val json = Json { ignoreUnknownKeys = true }

    @JvmBlocking
    @JvmAsync
    actual override suspend fun verify(
        data: JsonObject,
        args: Any?,
        context: Map<String, Any>
    ): Result<Any> {
        // 1) 优先用外部传入的 args（如果你想让 data 形态优先生效，可以把这段放到最后）
        when (args) {
            is W3CStatusPolicyListArguments -> return verifyWithAttributes(data, args)
            is W3CStatusPolicyAttribute     -> return verifyWithAttributes(data, args)
            is IETFStatusPolicyAttribute    -> return verifyWithAttributes(data, args)
            is JsonElement                  -> return verifyWithAttributes(data, parseArgsFromJson(args))
            is List<*> -> {
                val list = args.filterIsInstance<W3CStatusPolicyAttribute>()
                if (list.isNotEmpty()) return verifyWithAttributes(data, W3CStatusPolicyListArguments(list))
            }
            null -> {} // 继续走 data 自动判别
            else -> return Result.failure(IllegalArgumentException("Unsupported args: ${args::class.simpleName}"))
        }

        // 2) 从 VC 中抽取 credentialStatus，并根据其形态决定 attribute
        val cs = findCredentialStatusNode(data)
            ?: return verifyWithAttributes(data, defaultAttribute) // 没有 credentialStatus，当作可用（或按需改成失败）

        return when (cs) {
            is JsonArray -> {
                // 数组：为每个条目生成 attribute
                val attrs = cs.mapIndexed { idx, el ->
                    require(el is JsonObject) {
                        "credentialStatus[$idx] must be a JSON object, got ${el::class.simpleName}"
                    }
                    toAttribute(el, fallback = defaultAttribute)
                }
                verifyWithAttributes(data, W3CStatusPolicyListArguments(attrs))
            }
            is JsonObject -> {
                val attr = toAttribute(cs, fallback = defaultAttribute)
                verifyWithAttributes(data, attr)
            }
            is JsonPrimitive -> {
                // 字符串（例如 token-status-list 的场景）
                if (cs.isString) verifyWithAttributes(data, defaultAttributeOfJWT)
                else verifyWithAttributes(data, defaultAttribute)
            }
            else -> Result.failure(IllegalArgumentException("Unsupported credentialStatus JSON type: ${cs::class.simpleName}"))
        }
    }

    /**
     * 支持多种 VC 结构下的 credentialStatus 位置：
     * - 顶层: data["credentialStatus"]
     * - W3C VC v2: data["vc"]?.jsonObject?.get("credentialStatus")
     * - JWT 包裹（有些实现把 VC 放在 "vc" 或 "vc.credentialSubject" 等）
     * 如有自定义路径，请在此处补充。
     */
    private fun findCredentialStatusNode(vc: JsonObject): JsonElement? {
        vc["credentialStatus"]?.let { return it }
        val vcField = vc["vc"] as? JsonObject
        vcField?.get("credentialStatus")?.let { return it }
        // 某些实现中，JWT 的 status 可能在 "status" / "tokenStatus" 等字段（按需扩展）
        vc["status"]?.let { return it }
        vc["tokenStatus"]?.let { return it }
        return null
    }

    /**
     * 将单个 credentialStatus 对象映射为 Attribute：
     * - value: 取 statusListIndex / status_list_index / index，默认 0u
     * - purpose: 取 statusPurpose / purpose，默认 "revocation"
     * - type: 取 type（字符串）映射到 Values（未知则回落到 fallback.type）
     */
    private fun toAttribute(obj: JsonObject, fallback: W3CStatusPolicyAttribute): W3CStatusPolicyAttribute {
        val idx = (obj["statusListIndex"] ?: obj["status_list_index"] ?: obj["index"])
            ?.let { (it as? JsonPrimitive)?.intOrNull }?.toUInt() ?: fallback.value

        val purpose = (obj["statusPurpose"] ?: obj["purpose"])
            ?.let { (it as? JsonPrimitive)?.contentOrNull } ?: fallback.purpose

        val typeStr = (obj["type"] as? JsonPrimitive)?.contentOrNull
        val type = when (typeStr?.lowercase()) {
            "statuslist2021", "status_list_2021", "w3cstatuslist2021" -> Values.STATUS_LIST_2021
            "token_status_list", "tokenstatuslist", "ietf-token-status-list" -> Values.TOKEN_STATUS_LIST
            else -> fallback.type
        }

        return W3CStatusPolicyAttribute(value = idx, purpose = purpose, type = type)
    }

    private fun parseArgsFromJson(el: JsonElement): StatusPolicyArgument = when (el) {
        is JsonObject -> json.decodeFromJsonElement(W3CStatusPolicyAttribute.serializer(), el)
        is JsonArray  -> W3CStatusPolicyListArguments(
            json.decodeFromJsonElement(
                kotlinx.serialization.builtins.ListSerializer(W3CStatusPolicyAttribute.serializer()), el
            )
        )
        else -> throw IllegalArgumentException("Unsupported JSON args: ${el::class.simpleName}")
    }
}

