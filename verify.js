# v1.0.0 における Credential Offer の複数 Holder 利用について

## 1. Pre-Authorized Code Flow

Credential Offer 作成時に `sessionId` が生成され、
Pre-Authorized Code と Issuance Session が同じ `sessionId` に紐づきます。

参照: [`CredentialOfferService.kt#L33`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L33)

```text
構成：
1 Credential Offer URL
        │
        ├─ 1 Pre-Authorized Code
        └─ 1 Issuance Session
                ↓
          1 Issuance Flow
```

Pre-Authorized Code は Token Request の処理時に削除されるため、
同じ Code を再利用することはできません。

参照: [`ConfiguredPreAuthorizedCodeRepository.kt#L29`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/openid4vci/ConfiguredPreAuthorizedCodeRepository.kt#L29)

```kotlin
override suspend fun consume(code: String): PreAuthorizedCodeRecord? {
    val record = records.getAndRemove(code) ?: return null
    return record.takeIf { Clock.System.now() <= it.expiresAt }
}
```

```text
処理フロー：
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

Credential Request 時には Issuance Session が `claimSession()` により確保されます。
`claimSession()` では Session が `getAndRemove()` されるため、
同じ Issuance Session を複数回の Credential Issuance に利用することはできません。

参照: [`ConfiguredIssuanceSessionRepository.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/ConfiguredIssuanceSessionRepository.kt)

```kotlin
override suspend fun take(sessionId: String): IssuanceSession? =
    sessions.getAndRemove(sessionId)?.let { session ->
        attachCrypto2Key(session, backfill = false).also {
            crypto2Keys.remove(sessionId)
        }
    }
```

```text
確認結果：
Holder A → 発行成功
Holder B → HTTP 400 / invalid_grant
```

同一 Credential Offer URL を利用して、
複数の Holder がそれぞれ Credential 発行を完了することはできません。

複数 Holder に対応する場合は、
Pre-Authorized Code / Issuance Session の生成・管理方法を
変更する必要があります。

---

## 2. Authorization Code Flow

Authorization Code Flow では、
`issuerStateMode` によって Credential Offer 作成時の `sessionId` を
`issuer_state` として引き継ぐかどうかが異なります。

デフォルトは `INCLUDE` です。

参照: [`CredentialOfferService.kt#L47`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L47)

```kotlin
val issuerStateMode = when (request.authMethod) {
    AuthenticationMethod.PRE_AUTHORIZED -> null
    AuthenticationMethod.AUTHORIZED ->
        request.issuerStateMode ?: IssuerStateMode.INCLUDE
}
```

どちらのモードでも、Issuance Session 自体は
1回の Credential Issuance を前提とした実装になっています。

違いは、`INCLUDE` では Credential Offer 作成時の Session を引き継ぎ、
`OMIT` では Authorization Request ごとに新しい Session を生成する点です。

---

### 2.1 issuerStateMode = INCLUDE

Credential Offer 作成時の `sessionId` が
`issuer_state` として Offer に設定されます。

参照: [`CredentialOfferService.kt#L78`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L78)

```kotlin
CredentialOffer.withAuthorizationCodeGrant(
    credentialIssuer = issuerBaseUrl(),
    credentialConfigurationIds = listOf(profile.credentialConfigurationId),
    issuerState = sessionId.takeIf {
        issuerStateMode == IssuerStateMode.INCLUDE
    },
)
```

Authorization Request 時は、
`issuer_state` から既存の Issuance Session を取得します。

参照: [`OpenId4VciProtocolService.kt#L1412`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt#L1412)

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
        │
        ├─ 1 issuer_state
        └─ 1 Issuance Session
                ↓
        Authorization Flow
                ↓
        Authorization Code
                ↓
        Credential Issuance
```

Authorization Code は Token Request の処理時に削除されるため、
同じ Code を再利用することはできません。

参照: [`ConfiguredAuthorizationCodeRepository.kt#L26`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/openid4vci/ConfiguredAuthorizationCodeRepository.kt#L26)

```kotlin
override suspend fun consume(code: String): AuthorizationCodeRecord? {
    val record = records.getAndRemove(code) ?: return null
    return record.takeIf { Clock.System.now() <= it.expiresAt }
}
```

```text
処理フロー：
Credential Offer を取得
        ↓
issuer_state を取得
        ↓
Authorization Request
        ↓
issuer_state から
既存の Issuance Session を取得
        ↓
Authorization Code を取得
        ↓
Token Request
        ↓
Authorization Code を consume()
        ↓
getAndRemove()
        ↓
同じ Code は再利用不可
        ↓
Access Token を取得
        ↓
Credential Request
        ↓
Issuance Session を claimSession()
        ↓
同じ Session は再利用不可
```

同一 Credential Offer URL を複数 Holder で利用した場合も、
同じ `issuer_state` / Issuance Session を参照します。

また、Issuance Session 自体も1回の Credential Issuance 用であるため、
複数 Holder がそれぞれ Credential 発行を完了する構成には適していません。

---

### 2.2 issuerStateMode = OMIT

`OMIT` の場合、
Credential Offer には `issuer_state` が含まれません。

Authorization Request 時に `issuer_state` がない場合は、
新しい Issuance Session が生成されます。

参照: [`OpenId4VciProtocolService.kt#L1408`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt#L1408)

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

新しい Session は Authorization Request ごとに UUID で生成されます。

参照: [`OpenId4VciProtocolService.kt#L1437`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt#L1437)

```kotlin
IssuanceSession(
    sessionId = UUID.randomUUID().toString(),
    ...
)
```

```text
構成：
1 Credential Offer URL
        │
        └─ issuer_state なし
                ↓
      Authorization Request ごとに
      新しい Issuance Session を生成
                ↓
        Authorization Code
                ↓
        Credential Issuance
```

Authorization Code 自体は各 Flow で1回のみ利用可能です。

```text
処理フロー：
Credential Offer を取得
        ↓
Authorization Request
        ↓
issuer_state がないため
新しい Issuance Session を生成
        ↓
Authorization Code を取得
        ↓
Token Request
        ↓
Authorization Code を consume()
        ↓
getAndRemove()
        ↓
同じ Code は再利用不可
        ↓
Access Token を取得
        ↓
Credential Request
        ↓
Issuance Session を claimSession()
        ↓
同じ Session は再利用不可
```

```text
確認結果：
Holder A → 発行成功
Holder B → HTTP 400 / invalid_credential_request
```

`OMIT` では、Authorization Request ごとに
新しい Issuance Session が生成されます。

そのため、同一 Credential Offer URL を利用した場合でも、
各 Authorization Request は別の Issuance Session で処理されます。

ただし、実際の確認では、
1人目の Holder は発行成功しましたが、
2人目の Holder は Credential Request で
`invalid_credential_request` となりました。

そのため、現時点では
同一 Credential Offer URL を複数 Holder で利用して
それぞれ発行を完了できることは確認できていません。
