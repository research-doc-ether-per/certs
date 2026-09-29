
### 6.2 VC Status 検証（VC 有効・失効管理）についてのエラー

``` text
Unsupported unsigned status-list text format
```

#### 6.2.1 Verifier API2 の Status 検証設計

``` text
概略フロー：

VC
 ↓ credentialStatus
BitstringStatusListEntry
 ↓ statusListCredential
Status List 発行元
 ↓ Status List を取得
Verifier API2
 ├─ Status List の署名検証
 ├─ JWT payload を解析
 ├─ credentialSubject / encodedList を取得
 ├─ statusListIndex に対応する bit を取得
 └─ policy で指定された許容値と比較
```

[StatusValidatorBase.kt](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-verification-policies2/src/commonMain/kotlin/id/walt/policies2/vc/policies/status/validator/StatusValidatorBase.kt#L74)
では、Text 形式の Status List に対して JWT 形式かどうかを確認し、 JWT の場合に署名検証を実行する。

``` kotlin
is StatusListContent.Text -> {
    if (isJwt(content.content)) {
        verifier.verifyJwtWithSigner(content.content).getOrElse {
            throw StatusVerificationError(
                "Status list JWT signature verification failed: ${it.message}"
            )
        }
    } else {
        throw StatusVerificationError(
            "Unsupported unsigned status-list text format"
        )
    }
}
```

JWT 判定：

``` kotlin
private fun isJwt(content: String): Boolean {
    return content.startsWith("ey") &&
        content.count { it == '.' } == 2
}
```

署名検証後、`W3CStatusValueReader` は JWT payload から `credentialSubject` を取得する。

``` kotlin
val credentialSubject =
    (payload["vc"]?.jsonObject ?: payload)
        ["credentialSubject"]
        ?.jsonObject!!

return jsonModule.decodeFromJsonElement<W3CStatusContent>(
    credentialSubject
)
```

Status List JWT の署名検証と、対象 VC の Status 検証は別の処理となる。

-   JWT signature：Status List 自体の真正性・改ざん有無を検証
-   Status value：`statusListIndex` に対応する bit を確認し、対象 VC の状態を検証

#### 6.2.2 現在の VC Status API の処理

現在、`statusListCredential` から取得される Status List は JSON 形式で返却されている。

一方、Verifier API2 v1.0.0 の W3C Status List 検証処理では、 署名済み JWT 形式の Status List を前提としているため、 現在の JSON
形式では以下のエラーが発生する。

``` text
Unsupported unsigned status-list text format
```

#### 6.2.3 対応方針

1.  非推奨：Verifier API2 の policy を既存 JSON に合わせて変更する

    -   既存 JSON をそのまま利用するために、`verification-policies2` 側へ JSON reader を追加することも可能。
    -   ただし、JSON proof の検証方式、JWT / JSON の分岐処理、今後の walt.id 更新との整合性など、独自修正の保守範囲が広がる。

2.  推奨：VC Status API に署名済み Status List JWT の返却処理を追加する

    -   Verifier API2 の標準 `credential-status` policy は変更しない。
    -   VC Status API 側で、Verifier API2 が検証可能な署名済み Status List JWT を返却する処理を追加する。
