# Walt.id v0.15.1 における VC 検証の制限と VP 生成仕様

- Walt.id v0.15.1 の実装では、OID4VP 仕様上は複数の VC フォーマットや複数のプレゼンテーション提示が理論的には許可されているが、実際の実装では一度に扱えるフォーマットや提示数に制限があり、以下のような制約が存在する。

## 実装上の制限

### 1. Verifier 側：単一フォーマット強制

1. [VerificationUseCase.kt](https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-services/waltid-verifier-api/src/main/kotlin/id/walt/verifier/oidc/VerificationUseCase.kt)
    ```kotlin
    private fun getPresentationFormat(requestedCredentials: List<RequestedCredential>): VCFormat {
        val credentialFormat =
            requestedCredentials.map { it.format ?: it.inputDescriptor?.format?.keys?.first() }.distinct().singleOrNull()
        if (credentialFormat == null)
            throw IllegalArgumentException("Credentials formats must be distinct for a presentation request")
    }
    ```
    - distinct でフォーマットを一意化し、singleOrNull で 1 種類のみ許可。複数フォーマット（jwt_vc_json と vc+sd-jwt）が同時に含まれる場合は例外を投げる。

### 2. Verifier 側：vp_token が配列の場合のエラー

1. [OIDCVerifierService.kt](https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-services/waltid-verifier-api/src/main/kotlin/id/walt/verifier/oidc/OIDCVerifierService.kt)
    ```kotlin
    val vpToken = when (tokenResponse.vpToken) {
        is JsonObject -> tokenResponse.vpToken.toString()
        is JsonPrimitive -> tokenResponse.vpToken!!.jsonPrimitive.content
        else -> throw IllegalArgumentException("Illegal tokenResponse.vpToken: ${tokenResponse.vpToken}")
    }
    ```
   -  vp_token が JsonArray（複数 SD-JWT 提示）である場合、Illegal tokenResponse.vpToken が発生し処理が中断される。

### 3. Wallet 側の VP 生成挙動

1. [TestCredentialWallet.kt](https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-services/waltid-wallet-api/src/main/kotlin/id/walt/webwallet/service/oidc4vc/TestCredentialWallet.kt)
    ```kotlin
    override fun generatePresentationForVPToken(session: VPresentationSession, tokenRequest: TokenRequest): PresentationResult {
        val matchedCredentials = credentialsService.get(selectedCredentials)
        val jwtsPresented = CredentialFilterUtils.getJwtVcList(matchedCredentials, selectedDisclosures)
        val sdJwtVCsPresented = matchedCredentials.filter { it.format == CredentialFormat.sd_jwt_vc }.map {
            SDJwtVC.parse(it.document).present(true, audience = session.authorizationRequest.clientId, nonce = session.nonce ?: "",
                WaltIdJWTCryptoProvider(mapOf(key.getKeyId() to key)), key.getKeyId())
        }.map { it.toString(true, true) }
        val vp = if (jwtsPresented.isNotEmpty()) getVpJson(...) else null
        val signedJwtVP = if (!vp.isNullOrEmpty()) key.signJws(vp.toByteArray(), mapOf("typ" to "JWT".toJsonElement())) else null
        val presentations = listOf(signedJwtVP, deviceResponse).filterNotNull().plus(sdJwtVCsPresented).map { JsonPrimitive(it) }
        return PresentationResult(presentations, PresentationSubmission(...))
    }
    ```
    - JWT-VC は複数の VC をひとまとめにして VP-JWT として署名し提示する。  
    - SD-JWT は VP を生成せず、VC 自身（`<sd-jwt>~<disclosure>` 形式）をそのまま提示する方式であり、1 件のみ対応している。複数の SD-JWT を同時に提示すると presentations が配列化され、Verifier 側でエラーとなる。  
    - mdoc（ISO 18013-7）は DeviceResponse（CBOR + COSE 署名）形式で提示されるが、こちらも複数 mdoc の同時提示には対応しておらず、1 件のみ処理可能。  

## 実際の制約まとめ

| ケース             | 想定結果              | 現行挙動                      |
| ------------------ | --------------------- | ----------------------------- |
| JWT-VC のみ        | VP-JWT 生成・検証成功 | OK                            |
| SD-JWT（1 件）     | SD-JWT 文字列提示     | OK                            |
| SD-JWT（複数）     | 配列送信でエラー      | Illegal tokenResponse.vpToken |
| JWT + SD-JWT 混在  | 異フォーマットで例外  | formats must be distinct      |
| JWT + mdoc 混在    | 同上                  | 同上                          |
| SD-JWT + mdoc 混在 | 同上                  | 同上                          |

## OID4VP 規格との比較

OID4VP 仕様上は、複数の VC を同時に提示したり、異なるフォーマット（JWT・SD-JWT・mdoc）を混在して提示することが可能とされている。  
一方で、Walt.id v0.15.1 の実装では提示形式や vp_token の構造に以下のような制限がある。

| 項目 | OID4VP 標準仕様 | Walt.id v0.15.1 実装 |
|------|----------------|----------------|
| 複数フォーマット混在の VC 提示 | 許可される | 非対応（単一フォーマットのみ） |
| JWT 形式の VC 提示 | 単一または複数の VP-JWT 提示を許可 | 対応（複数 JWT-VC を 1 つの VP-JWT にまとめて提示可能） |
| SD-JWT 形式の VC 提示 | 単一または複数提示を許可 | 対応（単一のみ、複数同時提示は未対応） |
| mdoc 形式の VC 提示 | 単一または複数提示を許可 | 対応（単一のみ、複数同時提示は未対応） |
| vp_token のフォーマット | 文字列（単一）または配列（複数提示）を許可 | 文字列のみ対応（配列形式 JsonArray は未対応） |

