`/callback` では、認証後のユーザー情報と Offer のセッション情報を取得できます。
ユーザー情報は `currentPrincipal.accessToken` から取得し、Offer の詳細情報は Session から取得できます。

ログ情報は以下のとおりです。

ユーザー情報取得のコード例：

```kotlin
// パッケージのインポート
import java.util.Base64
import io.ktor.server.auth.OAuthAccessTokenResponse
import io.ktor.server.auth.principal

get("/callback") {
    // 元コード ...

    // Access Token の解析
    val accessToken = currentPrincipal?.accessToken
    val preferredUsername = accessToken?.let { token ->
        try {
            val payloadBase64 = token.split(".")[1]
            val payloadJsonString = String(Base64.getUrlDecoder().decode(payloadBase64))

            val payloadJson = Json.parseToJsonElement(payloadJsonString).jsonObject
            payloadJson["preferred_username"]?.jsonPrimitive?.content
        } catch (e: Exception) {
            logger.error(e) { "Failed to get preferred_username" }
            null
        }
    }

    logger.info { "Preferred Username: $preferredUsername" }

    // 元コード ...
}
```

認証後のユーザー情報と Offer 発行者情報の一致確認については、2つの案があると考えています。

**案1：Offer 発行 API に発行者情報を追加する方法**

Offer 発行 API に発行者情報のパラメータ（例：`offerIssuer`）を追加し、Offer 発行時にその値を walt.id 側へ渡します。
今回は確認用として、いったん `credentialSubject.credentialInformation` に `offerIssuer` を設定しています。

その後、`/callback` 内で `currentPrincipal.accessToken` から取得した認証後のユーザー情報と比較します。

比較コード例：

```kotlin
val offerIssuer = session?.issuanceRequests?.firstOrNull()
    ?.credentialData
    ?.get("credentialSubject")?.jsonObject
    ?.get("credentialInformation")?.jsonObject
    ?.get("offerIssuer")?.jsonPrimitive?.contentOrNull

if (offerIssuer != null) {
    val isOfferIssuerMatch = preferredUsername == offerIssuer
    logger.info { "[offerIssuer Check] preferredUsername: '$preferredUsername' | offerIssuer: '$offerIssuer' | Match: $isOfferIssuerMatch" }
} else {
    logger.info { "[offerIssuer Check] offerIssuer is not specified in session, skipping comparison" }
}
```

**案2：`/authorize` API 呼び出し時に `user_hint` として渡す方法**

Offer 発行後、Offer 発行者情報を追加可能証明書一覧テーブルに保存します。
その後、Offer 解析時に DB から発行者情報を取得し、`/authorize` API 呼び出し時に Offer 発行者情報を `user_hint` として渡します。

`/callback` 内では、認証後のユーザー情報と `user_hint` を比較します。

比較コード例：

```kotlin
val userHint = session?.authorizationRequest?.userHint

if (userHint != null) {
    val isUserHintMatch = preferredUsername == userHint
    logger.info { "[userHint Check] preferredUsername: '$preferredUsername' | userHint: '$userHint' | Match: $isUserHintMatch" }
} else {
    logger.info { "[userHint Check] userHint is not specified in session, skipping comparison" }
}
```

案2のほうが改修範囲が小さく、実装しやすいと考えています。
