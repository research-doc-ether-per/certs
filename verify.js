import id.walt.sdjwt.utils.Base64Utils.base64UrlDecode
 private val kbPayload: JsonObject? = keyBindingJwt?.let { jwt ->
        runCatching {
            val payloadB64Url = jwt.split(".")[1]
            val json = payloadB64Url.base64UrlDecode().decodeToString()
            Json.parseToJsonElement(json).jsonObject
        }.getOrNull()
    }
