    // ★ 新增：Bitstring/W3C 用 JSON 获取器（只读一次、非空校验、Accept: application/json）
    suspend fun fetchJson(url: String): Result<String> = runCatching {
        logger.debug { "Fetching JSON content from URL: $url" }

        val resp: HttpResponse = client.get(url) {
            header(HttpHeaders.Accept, "application/json")  // 期望拿到 JSON
            // GET 不要带 Content-Type
        }
        if (!resp.status.isSuccess()) {
            throw IllegalStateException("URL $url returned unexpected status: ${resp.status}")
        }

        val text = resp.bodyAsText()                       // 只读一次
        logger.debug { "Fetched ${text.length} bytes from $url" }
        require(text.isNotBlank()) { "Empty body for $url" }  // 非空断言，防止 EOF
        text
    }.onFailure { t ->
        logger.error(t) { "Failed to fetch JSON content from URL: $url" }
    }
