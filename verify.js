package id.walt.policies.policies.status.validator

import id.walt.policies.policies.status.CredentialFetcher
import id.walt.policies.policies.status.model.StatusPolicyAttribute
import id.walt.policies.policies.status.model.StatusContent
import id.walt.policies.policies.status.model.StatusEntry
import id.walt.policies.policies.status.model.StatusRetrievalError
import id.walt.policies.policies.status.model.StatusVerificationError
import id.walt.policies.policies.status.reader.StatusValueReader
import id.walt.policies.policies.status.reader.W3CStatusValueReader
import id.walt.policies.policies.status.content.ContentParser
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.decodeFromJsonElement

abstract class StatusValidatorBase<K : StatusContent, M : StatusEntry, T : StatusPolicyAttribute>(
    private val fetcher: CredentialFetcher,
    private val reader: StatusValueReader<K>,
) : StatusValidator<M, T> {
    protected val logger = KotlinLogging.logger {}

    override suspend fun validate(entry: M, attribute: T): Result<Unit> = runCatching {
        logger.debug { "Credential URL: ${entry.uri}" }

        // === Step 1. 从 URL 获取 status 文件内容 ===
        val statusListContent = fetcher.fetch(entry.uri)
            .getOrElse { throw StatusRetrievalError(it.message ?: "Status credential download error") }

        logger.debug { "=====> statusListContent:\n$statusListContent" }

        // === Step 2. 判断是 JWT 还是 JSON ===
        val isJson = statusListContent.trimStart().startsWith("{")

        val statusList = if (isJson) {
            // === JSON 格式：直接用 JSON 解析 ===
            logger.debug { "Detected JSON format for status list." }

            val jsonObj = Json.parseToJsonElement(statusListContent).jsonObject

            // credentialSubject 是 BitstringStatusListCredential 的主体
            val credentialSubject = jsonObj["credentialSubject"]?.jsonObject
                ?: throw StatusRetrievalError("Missing 'credentialSubject' in status list JSON")

            // 使用 Waltid 的 W3CStatusValueReader 结构反序列化
            val json = Json { ignoreUnknownKeys = true; isLenient = true }
            val w3cStatusContent = json.decodeFromJsonElement<id.walt.policies.policies.status.model.W3CStatusContent>(
                credentialSubject
            )
            logger.debug { "Parsed W3CStatusContent (JSON mode) successfully." }
            w3cStatusContent
        } else {
            // === JWT 格式：仍然走原有 reader 逻辑 ===
            logger.debug { "Detected JWT format for status list." }
            reader.read(statusListContent)
                .getOrElse { throw StatusRetrievalError(it.message ?: "Status credential parsing error") }
        }

        // === Step 3. 校验状态 ===
        val bitValue = getBitValue(statusList, entry)
        logger.debug { "EncodedList[${entry.index}] = $bitValue" }

        customValidations(statusList, attribute)
        statusValidations(bitValue, attribute)
    }

    // === 以下保持不变 ===
    protected abstract fun getBitValue(statusList: K, entry: M): List<Char>
    protected abstract fun customValidations(statusList: K, attribute: T)

    private fun statusValidations(bitValue: List<Char>, attribute: T) {
        if (bitValue.isEmpty()) throw StatusVerificationError("Null or empty bit value")
        if (!isBinaryValue(bitValue)) throw StatusVerificationError("Invalid bit value: $bitValue")

        val binaryString = bitValue.joinToString("")
        val intValue = binToInt(binaryString)
        if (intValue.toUInt() != attribute.value)
            throw StatusVerificationError("Status validation failed: expected ${attribute.value}, but got $intValue")
    }

    private fun isBinaryValue(value: List<Char>) = setOf('0', '1').let { valid -> value.all { it in valid } }
    private fun binToInt(bin: String) = bin.toInt(2)
}
