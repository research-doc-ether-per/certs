    override fun tryParseDirectJson(body: String): IETFStatusContent? = runCatching {
        val obj = jsonModule.parseToJsonElement(body).jsonObject
        val sl = obj["status_list"]?.jsonObject
            ?: error("Missing 'status_list' in JSON response")
        jsonModule.decodeFromJsonElement<IETFStatusContent>(sl)
    }.getOrNull()
