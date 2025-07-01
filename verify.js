import id.walt.sdjwt.utils.Base64Utils.base64UrlDecode
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

val kbJwt = sdJwtVC.keyBindingJwt
if (kbJwt != null) {
    val parts = kbJwt.split('.')
    parts.forEachIndexed { i, part -> println("kbJwt part[$i] = $part") }

    val payloadObj: JsonObject? = parts.getOrNull(1)
        ?.let { b64 ->
            runCatching {
                val jsonText = b64.base64UrlDecode().decodeToString()
                Json.parseToJsonElement(jsonText).jsonObject
            }.getOrNull()
        }
}
