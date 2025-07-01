    val kbPayload: JsonObject? by lazy {
        keyBindingJwt?.let { jwt ->
            runCatching {
                val payloadB64 = jwt.split(".")[1]                 // 取第二段
                val jsonText   = payloadB64.base64UrlDecode().decodeToString()
                Json.parseToJsonElement(jsonText).jsonObject
            }.getOrNull()
        }
    }
