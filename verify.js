override suspend fun verify(
        credential: DigitalCredential,
        context: PolicyExecutionContext
    ): Result<JsonObject> {

        println("==================================================")
        println("CredentialSignaturePolicy 署名検証を開始します")
        println("対象資格情報の証明書フォーマット ${credential.format}")
        println("対象資格情報の発行者 ${credential.issuer}")
        println("==================================================")

        // 発行者の公開鍵（DIDなどから解決された鍵）の取得を試みます
        val signerKey = credential.getSignerKey()
        
        if (signerKey == null) {
            println("==================================================")
            println("CredentialSignaturePolicy エラー 発行者の公開鍵の取得に失敗しました")
            println("資格情報データ $credential")
            println("==================================================")
            return Result.failure(
                IllegalArgumentException(
                    "Failed to retrieve issuer key to verify credential signature against, for credential: $credential",
                )
            )
        }

        println("==================================================")
        println("CredentialSignaturePolicy 公開鍵の取得に成功しました")
        println("鍵ID ${signerKey.getKeyId()}")
        println("鍵タイプ ${signerKey.keyType.name}")
        println("==================================================")

        // 取得した公開鍵を使用して、実際の署名検証を実行します
        val verificationResult = credential.verify(signerKey)

        if (verificationResult.isSuccess) {
            println("==================================================")
            println("CredentialSignaturePolicy 暗号数学的な署名検証に成功しました")
            println("==================================================")
            
            return Result.success(buildJsonObject {
                put("verification_result", JsonPrimitive(verificationResult.isSuccess))
                put("signed_credential", JsonPrimitive(credential.signed))
                put("credential_signature", Json.encodeToJsonElement(credential.signature))
                put("verified_data", verificationResult.getOrNull() ?: JsonNull)
                put("successful_issuer_public_key", signerKey.exportJWKObject())
                put("successful_issuer_public_key_id", JsonPrimitive(signerKey.getKeyId()))
            })
        }

        // 署名検証が失敗した場合の例外と原因を出力します
        val exception = verificationResult.exceptionOrNull()
        println("==================================================")
        println("CredentialSignaturePolicy 署名検証が不一致となりました")
        println("エラーメッセージ ${exception?.message}")
        println("==================================================")
        exception?.printStackTrace()

        return Result.failure(
            IllegalArgumentException(
                "Failed to verify credential signature, for credential: $credential",
            )
        )
    }
