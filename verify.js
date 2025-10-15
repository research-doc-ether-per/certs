    override fun tryParseDirectJson(body: String): IETFStatusContent? = runCatching {
        val obj = jsonModule.parseToJsonElement(body).jsonObject
        val sl = obj["status_list"]?.jsonObject
            ?: error("Missing 'status_list' in JSON response")
        jsonModule.decodeFromJsonElement<IETFStatusContent>(sl)
    }.getOrNull()

 override fun read(response: String) = runCatching {
        val body = response.trim()
        if (body.startsWith("{")) {
            logger.debug { "Detected direct JSON response for status list." }
            val parsed = tryParseDirectJson(body)
                ?: error("Direct JSON detected, but this reader cannot parse it. Override tryParseDirectJson().")
            parsed
        } else {
            logger.debug { "Detected JWT response for status list." }
            val payload = parser.parse(body)
            logger.debug { "Payload: $payload" }
            val statusList = parseStatusList(payload)
            logger.debug { "Parsed status content: $statusList" }
            statusList
        }
    }
