object IssuerKeyResolver {
    private val log = KotlinLogging.logger { }

    suspend fun resolveForJwtSignedCredential(jwtHeader: JsonObject?, credentialData: JsonObject): Key? {
        val issuerId = (credentialData["iss"] ?: credentialData["issuer"]).getItAsStringOrId()
        
        println("==================================================")
        println("IssuerKeyResolver 発行者の公開鍵解決を開始します")
        println("解析対象の発行者ID $issuerId")
        println("JWTヘッダーの内容 $jwtHeader")
        println("==================================================")

        log.trace { "Attempting to resolve issuer key for: $issuerId" }
        
        return runCatching {
            val resolvedKey = when {
                // 1. DID Resolution
                issuerId != null && DidUtils.isDidUrl(issuerId) -> {
                    println("==================================================")
                    println("IssuerKeyResolver DIDによる解決を試みます")
                    println("==================================================")
                    DidKeyResolver.resolveKeyFromDid(issuerId)
                }
                
                // 2. Inline X.509 Certificate Chain
                jwtHeader?.contains("x5c") == true -> {
                    println("==================================================")
                    println("IssuerKeyResolver X5C証明书チェーンによる解決を試みます")
                    println("==================================================")
                    X5CKeyResolver.resolveKeyFromX5c(jwtHeader["x5c"]!!.jsonArray)
                }
                
                // 3. JWT VC Issuer Metadata (for SD-JWT VC)
                issuerId != null && issuerId.startsWith("https://") -> {
                    println("==================================================")
                    println("IssuerKeyResolver WellKnownメタデータによる解決を試みます")
                    println("==================================================")
                    WellKnownKeyResolver.resolveKeyFromWellKnown(issuerId, jwtHeader)
                }
                
                else -> {
                    println("==================================================")
                    println("IssuerKeyResolver 警告 サポートされている解決メソッドが見つかりません")
                    println("==================================================")
                    log.warn { "No supported issuer key resolution method found for issuer: $issuerId" }
                    null
                }
            }

            println("==================================================")
            if (resolvedKey != null) {
                println("IssuerKeyResolver 鍵の解決に成功しました")
                println("解決された鍵ID ${resolvedKey.getKeyId()}")
                println("解決された鍵タイプ ${resolvedKey.keyType.name}")
            } else {
                println("IssuerKeyResolver 警告 該当する解決ルートで鍵を取得できませんでした")
            }
            println("==================================================")

            resolvedKey
        }.getOrElse {
            println("==================================================")
            println("IssuerKeyResolver 重大なエラー 鍵の解決中に例外が発生しました")
            println("エラー詳細 ${it.message}")
            println("==================================================")
            it.printStackTrace()
            
            log.debug { "Could not resolve signer key: ${it.stackTraceToString()}" }
            null
        }
    }
}

