class DidWebResolver(private val client: HttpClient) : LocalResolverMethod("web") {

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    override suspend fun resolve(did: String): Result<DidDocument> {
        val url = resolveDidToUrl(did)

        println("==================================================")
        println("DidWebResolver resolve 開始")
        println("解決対象のDID $did")
        println("リクエスト送信先URL $url")
        println("==================================================")

        val response = runCatching {
            client.get(url).bodyAsText().let {
                println("==================================================")
                println("DidWebResolver HTTP通信成功 レスポンスボディを受信しました")
                println("受信データ\n$it")
                println("==================================================")
                DidDocument(jsonObject = Json.parseToJsonElement(it).jsonObject)
            }
        }.onFailure { err ->
            println("==================================================")
            println("DidWebResolver HTTP通信またはパースに失敗しました")
            println("エラー詳細 ${err.message}")
            println("==================================================")
            err.printStackTrace()
            throw IllegalStateException("Could not resolve DID document: $did at $url", err)
        }

        return response
    }

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    override suspend fun resolveToKey(did: String): Result<Key> {
        println("==================================================")
        println("DidWebResolver resolveToKey 開始 単一の鍵を返却します")
        println("==================================================")
        
        return resolveToKeys(did).map { 
            val firstKey = it.firstOrNull() ?: throw NoSuchElementException("No key could be imported")
            println("==================================================")
            println("DidWebResolver resolveToKey 最初の鍵の抽出に成功しました 鍵ID ${firstKey.getKeyId()}")
            println("==================================================")
            firstKey
        }
    }

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    override suspend fun resolveToKeys(did: String): Result<Set<Key>> {
        println("==================================================")
        println("DidWebResolver resolveToKeys 開始 複数鍵の解決を試みます")
        println("==================================================")

        val didDocumentResult = resolve(did)
        
        println("==================================================")
        println("DidWebResolver resolveToKeys ドキュメント取得完了")
        println("取得ステータス ${didDocumentResult.isSuccess}")
        println("==================================================")

        if (didDocumentResult.isFailure) return Result.failure(didDocumentResult.exceptionOrNull()!!)

        val didDocument = didDocumentResult.getOrNull()
            ?: return Result.failure(IllegalStateException("DID document is null for $did"))

        val verificationMethod = didDocument["verificationMethod"]
        
        if (verificationMethod == null) {
            println("==================================================")
            println("DidWebResolver エラー ドキュメント内に verificationMethod が見つかりません")
            println("==================================================")
            return Result.failure(IllegalStateException("No verification method found in DID document for $did"))
        }

        val verificationArray = verificationMethod.jsonArray

        val publicKeyJwks = verificationArray.mapNotNull { element ->
            runCatching {
                val method = element.jsonObject
                val publicKeyJwk = method["publicKeyJwk"]?.jsonObject
                    ?: return@runCatching null
                json.encodeToString(publicKeyJwk)
            }.getOrNull()
        }

        println("==================================================")
        println("DidWebResolver resolveToKeys 公開鍵JWKの抽出結果")
        println("抽出されたJWK文字列の総数 ${publicKeyJwks.size}")
        println("JWKリスト $publicKeyJwks")
        println("==================================================")

        if (publicKeyJwks.isEmpty()) {
            return Result.failure(IllegalStateException("No valid public key JWKs found in DID document for $did"))
        }

        return tryConvertPublicKeyJwksToKeys(publicKeyJwks)
    }

    private fun resolveDidToUrl(did: String): String = DidUtils.identifierFromDid(did)?.let {
        println("==================================================")
        println("DidWebResolver resolveDidToUrl 識別子を解析します")
        println("対象の識別子 $it")
        println("==================================================")

        val didParts = it.split(":")
        val domain = didParts[0].replace("%3A", ":")
        val selectedPath = didParts.drop(1)

        val path = when {
            selectedPath.isEmpty() -> "/.well-known/did.json"
            else -> "/${selectedPath.joinToString("/")}/did.json"
        }
        val builtUrl = "$urlProtocol://$domain$path"
        
        println("==================================================")
        println("DidWebResolver resolveDidToUrl 解析完了")
        println("構築されたターゲットURL $builtUrl")
        println("==================================================")
        
        builtUrl
    } ?: throw IllegalArgumentException("Unexpected did format (missing identifier): $did")

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    suspend fun tryConvertAnyPublicKeyJwkToKey(publicKeyJwks: List<String>): Result<JWKKey> {
        println("==================================================")
        println("DidWebResolver tryConvertAnyPublicKeyJwkToKey 実行中")
        println("==================================================")

        publicKeyJwks.forEach { publicKeyJwk ->
            val result = JWKKey.importJWK(publicKeyJwk)
            if (result.isSuccess) {
                val importedKey = result.getOrThrow()
                println("==================================================")
                println("DidWebResolver いずれかの鍵のインポートに成功しました 鍵ID ${importedKey.getKeyId()}")
                println("==================================================")
                return result
            }
        }
        return Result.failure(NoSuchElementException("No key could be imported"))
    }

    @JvmBlocking
    @JvmAsync
    @JsPromise
    @JsExport.Ignore
    suspend fun tryConvertPublicKeyJwksToKeys(publicKeyJwks: List<String>): Result<Set<JWKKey>> {
        println("==================================================")
        println("DidWebResolver tryConvertPublicKeyJwksToKeys 複数鍵変換を開始します")
        println("入力されたJWKの総数 ${publicKeyJwks.size}")
        println("==================================================")

        val keys = mutableSetOf<JWKKey>()

        for (publicKeyJwk in publicKeyJwks) {
            val result = JWKKey.importJWK(publicKeyJwk)
            if (result.isSuccess) {
                val keyObj = result.getOrThrow()
                println("==================================================")
                println("DidWebResolver 鍵のインポート成功 鍵ID ${keyObj.getKeyId()}")
                println("==================================================")
                keys.add(keyObj)
            } else {
                println("==================================================")
                println("DidWebResolver 警告 個別のJWKインポートに失敗しました $publicKeyJwk")
                println("==================================================")
            }
        }

        return if (keys.isNotEmpty()) {
            println("==================================================")
            println("DidWebResolver 鍵セットの変換処理が正常に完了しました 生成された総数 ${keys.size}")
            println("==================================================")
            Result.success(keys)
        } else {
            println("==================================================")
            println("DidWebResolver エラー ドキュメントからインポート可能な鍵が一つもありませんでした")
            println("==================================================")
            Result.failure(NoSuchElementException("No keys could be imported from the DID document"))
        }
    }

    companion object {

        private var httpsEnabled: Boolean = true

        val urlProtocol: String
            get() = if (httpsEnabled) "https" else "http"

        fun enableHttps(httpsEnabled: Boolean) {
            this.httpsEnabled = httpsEnabled
        }

        internal val json = Json { ignoreUnknownKeys = true }
    }
}
