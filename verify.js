import kotlin.jvm.JvmInline

@OptIn(ExperimentalEncodingApi::class)
private fun String.b64UrlDecodeToString(): String {
    val normalized = padEnd(length + (4 - length % 4) % 4, '=')
        .replace('-', '+').replace('_', '/')
    val bytes = kotlin.io.encoding.Base64.Default.decode(normalized)
    return bytes.decodeToString()
}

private val kbPayload: JsonObject? = keyBindingJwt?.let { jwt ->
        runCatching {
            val payloadB64 = jwt.split(".")[1]
            payloadB64.b64UrlDecodeToString().let { Json.parseToJsonElement(it).jsonObject }
        }.getOrNull()
    }
