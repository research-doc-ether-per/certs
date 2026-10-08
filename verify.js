
# v1.0.0 における Presentation Request URL の複数 Holder 利用について

walt.id v1.0.0 の Verifier API2 では、
同一 Presentation Request URL を複数の Holder で取得・解析できることを確認しました。

Verification Session 作成時に、
Presentation Request URL が生成されます。

```text
構成：
1 Presentation Request URL
        │
        └─ 1 Verification Session
```

同じ Presentation Request URL を複数の Holder で取得・解析できます。

```text
処理フロー：
Presentation Request URL を取得
        ↓
Holder A が Request を取得・解析
        ↓
Holder B が同じ Request URL を取得・解析
        ↓
同一 Presentation Request URL から再取得可能
```

Verifier2 の Request Endpoint では、
指定された Verification Session を取得して
Authorization Request を返します。

参照: [`OSSVerifier2Service.kt#L142`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-verifier-api2/src/main/kotlin/id/walt/verifier2/OSSVerifier2Service.kt#L142)

```kotlin
get("request", {
    summary = "Wallets lookup the AuthorizationRequest here"
}) {
    val verificationSession =
        repository.get(
            call.parameters.getOrFail(VERIFICATION_SESSION)
        )?.session
            ?: throw VerificationSessionNotFoundException(
                call.parameters.getOrFail(VERIFICATION_SESSION)
            )

    call.respondAuthorizationRequest(
        verificationSession = verificationSession,
        updateSessionCallback = updateSessionCallback
    )
}
```

Presentation Request の取得時に Verification Session の状態は
`IN_USE` に更新されますが、Request 自体は削除されません。

参照: [`Verifier2AuthorizationRequestHandler.kt#L71`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vp-verifier/src/commonMain/kotlin/id/walt/verifier2/handlers/authrequest/Verifier2AuthorizationRequestHandler.kt#L71)

```kotlin
verificationSession.updateSession(
    SessionEvent.authorization_request_requested
) {
    status = Verification2Session.VerificationSessionStatus.IN_USE
}
```

そのため、同じ Presentation Request URL から
複数の Holder が Presentation Request を取得できます。

```text
確認結果：
Holder A → 同一 Presentation Request URL から取得・解析成功
Holder B → 同一 Presentation Request URL から取得・解析成功
```
