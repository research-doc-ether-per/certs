val kbPayload: JsonObject? = sdJwtVC.keyBindingJwt
    ?.let { kbJwt ->
        runCatching {
            val payloadB64Url = kbJwt
                .substringAfter('.')
                .substringBeforeLast('.')
            val jsonText = payloadB64Url
                .base64UrlDecode()
                .decodeToString()
            Json.parseToJsonElement(jsonText).jsonObject
        }.getOrNull()
    }
