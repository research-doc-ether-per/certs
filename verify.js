# v1.0.0 における Credential Offer の複数 Holder 利用について

## 1. Pre-Authorized Code Flow

Credential Offer 作成時に `sessionId` が生成され、 Pre-Authorized Code と Issuance Session が同じ `sessionId` に紐づきます。（参照: [`CredentialOfferService.kt#L33`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L33)）




```text
構成：
1 Credential Offer URL
        │
        ├─ 1 Pre-Authorized Code
        └─ 1 Issuance Session
                ↓
          1 Issuance Flow
```

Pre-Authorized Code は Token Request の処理時に削除されるため、同じ Code を再利用することはできません。

[`ConfiguredPreAuthorizedCodeRepository.kt#L29`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/openid4vci/ConfiguredPreAuthorizedCodeRepository.kt#L29)

```kotlin
override suspend fun consume(code: String): PreAuthorizedCodeRecord? {
    val record = records.getAndRemove(code) ?: return null
    return record.takeIf { Clock.System.now() <= it.expiresAt }
}
```

```text
Credential Offer を取得
        ↓
Pre-Authorized Code を取得
        ↓
Token Request
        ↓
Pre-Authorized Code を consume()
        ↓
getAndRemove()
        ↓
同じ Code は再利用不可
        ↓
Access Token を取得
        ↓
Credential Request
```


```text
確認結果：
Holder A → 発行成功
Holder B → HTTP 400 / invalid_grant
```

同一 Credential Offer URL を利用して、複数の Holder がそれぞれ Credential 発行を完了することはできません。複数 Holder に対応する場合は、Pre-Authorized Code / Issuance Session の生成・管理方法を変更する必要があります。

---

## 2. Authorization Code Flow

Authorization Code Flow では、`issuerStateMode` によって Issuance Session の生成方法が異なります。  
デフォルトは `INCLUDE` です。

[`CredentialOfferService.kt#L47`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L47)

```kotlin
val issuerStateMode = when (request.authMethod) {
    AuthenticationMethod.PRE_AUTHORIZED -> null
    AuthenticationMethod.AUTHORIZED -> request.issuerStateMode ?: IssuerStateMode.INCLUDE
}
```

### 2.1 issuerStateMode = INCLUDE

Credential Offer 作成時の `sessionId` が `issuer_state` として Offer に設定されます。（参照:[`CredentialOfferService.kt#L78`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L78)）

```kotlin
CredentialOffer.withAuthorizationCodeGrant(
    credentialIssuer = issuerBaseUrl(),
    credentialConfigurationIds = listOf(profile.credentialConfigurationId),
    issuerState = sessionId.takeIf {
        issuerStateMode == IssuerStateMode.INCLUDE
    },
)
```

Authorization Request 時は、`issuer_state` から同じ Issuance Session を取得します。

[`OpenId4VciProtocolService.kt#L1412`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt#L1412)

```kotlin
authorizationRequest.issuerState
    ?.let { sessionId ->
        requireNotNull(
            sessionService.getSessionOrNull(sessionId)
        ) {
            "issuer_state is invalid"
        }
    }
```

```text
構成：
1 Credential Offer URL
        ↓
1 issuer_state
        ↓
1 Issuance Session
        ↓
Authorization Request
        ↓
Authorization Code
        ↓
Token Request
        ↓
Access Token
        ↓
Credential Request
```

Authorization Code は Token Request の処理時に削除されるため、同じ Code を再利用することはできません。

[`ConfiguredAuthorizationCodeRepository.kt#L26`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/openid4vci/ConfiguredAuthorizationCodeRepository.kt#L26)

```kotlin
override suspend fun consume(code: String): AuthorizationCodeRecord? {
    val record = records.getAndRemove(code) ?: return null
    return record.takeIf { Clock.System.now() <= it.expiresAt }
}
```

同一 Credential Offer URL を複数 Holder で利用した場合も、同じ `issuer_state` / Issuance Session を参照します。  
そのため、複数 Holder がそれぞれ Credential 発行を完了する構成には適していません。

---

### 2.2 issuerStateMode = OMIT

`OMIT` の場合、Credential Offer には `issuer_state` が含まれません。

Authorization Request 時に `issuer_state` がない場合は、新しい Issuance Session が生成されます。

[`OpenId4VciProtocolService.kt#L1408`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt#L1408)

```kotlin
private suspend fun resolveAuthorizationSession(
    authorizationRequest: AuthorizationRequest,
    parameters: Map<String, List<String>>,
): IssuanceSession =
    authorizationRequest.issuerState
        ?.let { sessionId ->
            requireNotNull(
                sessionService.getSessionOrNull(sessionId)
            ) {
                "issuer_state is invalid"
            }
        }
        ?: createAuthorizationCodeSessionFromProfile(
            authorizationRequest,
            parameters
        )
```

新しい Session は Authorization Request ごとに UUID で生成されます。（参照: [`OpenId4VciProtocolService.kt#L1437`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt#L1437)
）

```kotlin
IssuanceSession(
    sessionId = UUID.randomUUID().toString(),
    ...
)
```

```text
構成：
1 Credential Offer URL
        ↓
issuer_state なし
        ↓
Authorization Request A
        ↓
Issuance Session A
        ↓
Authorization Code A

Authorization Request B
        ↓
Issuance Session B
        ↓
Authorization Code B
```

Authorization Code 自体は各 Flow で1回のみ利用可能です。

```text
Authorization Code
        ↓
Token Request
        ↓
Authorization Code を consume()
        ↓
getAndRemove()
        ↓
同じ Code は再利用不可
        ↓
Access Token
        ↓
Credential Request
```

```text
確認結果：
Holder A → 発行成功
Holder B → HTTP 400 / invalid_credential_request
```

`OMIT` では Authorization Request ごとに新しい Issuance Session を生成する構成になっています。  
ただし、現時点では2人目の Credential Request が失敗しているため、複数 Holder での一連の発行処理については引き続き確認が必要です。
