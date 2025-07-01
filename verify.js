
val payloadObj: JsonObject? = sdJwtVC.keyBindingJwt
    ?.split('.')
    ?.getOrNull(1)
    ?.let { b64 ->
        runCatching {
            val jsonText = b64
                .base64UrlDecode()
                .decodeToString()
            Json.parseToJsonElement(jsonText).jsonObject
        }.getOrNull()
    }

if (sdJwtVC.keyBindingJwt != null) {
    println("keyBindingJwt present, payload = $payloadObj")
} else {
    println("no keyBindingJwt present")
}
