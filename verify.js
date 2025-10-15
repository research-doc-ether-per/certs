 override fun read(response: String) = runCatching {
        val body = response.trim()
        if (body.startsWith("{")) {
            // ---- 素の JSON ルート（例: W3C JSON-LD / IETF JSON デバッグ出力など）----
            logger.debug { "Detected direct JSON response for status list." }
            val parsed = tryParseDirectJson(body)
            require(parsed != null) {
                "Direct JSON detected, but this reader cannot parse it. " +
                "Override tryParseDirectJson() in subclass."
            }
            parsed!!
        } else {
            // ---- JWT ルート（従来どおり）----
            logger.debug { "Detected JWT response for status list." }
            val payload = parser.parse(body)
            logger.debug { "Payload: $payload" }
            val statusList = parseStatusList(payload)
            logger.debug { "Parsed status content: $statusList" }
            statusList
        }
    }
