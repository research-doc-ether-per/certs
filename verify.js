import id.walt.sdjwt.utils.Base64Url
private fun decodeJwtPayload(jwt: String): JsonObject? = runCatching {
        val parts = jwt.split(".")
        require(parts.size == 3) { "JWT format error" }
        val json = Base64Url.decode(parts[1]).decodeToString()
        Json.parseToJsonElement(json).jsonObject
    }.getOrNull()

    private val kbJwtPayload: JsonObject? = keyBindingJwt?.let { decodeJwtPayload(it) }

    /* ---------- 调试输出 ---------- */
    init {
        println(
            """
            ===== SDJwtVC created =====
            holderDid      = $holderDid
            holderKeyJWK   = ${holderKeyJWK?.withoutD()}
            issuer         = $issuer
            nbf / exp      = $notBefore / $expiration
            vct            = $vct
            status         = $status
            -- undisclosedPayload --
            $undisclosedPayload
            -- digestedHashes --
            ${sdPayload.digestedDisclosures}
            -- disclosures --
            $disclosures
            -- KB-JWT payload --
            $kbJwtPayload
            ==========================
            """.trimIndent()
        )
    }
