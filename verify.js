# v1.0.0 における Offer / Presentation Request の複数 Holder 利用について

## 概要

walt.id v1.0.0 では、Credential Offer の認可方式によって
Session の生成方法と複数 Holder 利用時の動作が異なります。

対象：

- Credential Offer URL
- Presentation Request URL

本資料では、v1.0.0 の実装内容と確認結果を整理します。

> ※ 複数 Holder 対応の具体的な修正方法については、別途検討します。

---

## 1. Credential Offer URL

Credential Offer には、主に以下の2つの認可方式があります。

- Pre-Authorized Code Flow
- Authorization Code Flow

---

### 1.1 Pre-Authorized Code Flow

#### 現状

Pre-Authorized Code Flow では、
Credential Offer 作成時に Issuance Session と Pre-Authorized Code が生成されます。

```text
1 Credential Offer URL
        ↓
1 Pre-Authorized Code
        ↓
1 Issuance Session
        ↓
1 Issuance Flow
```

Pre-Authorized Code は Token Request 後に再利用できません。

[`ConfiguredPreAuthorizedCodeRepository.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/openid4vci/ConfiguredPreAuthorizedCodeRepository.kt)

```kotlin
override suspend fun consume(code: String): PreAuthorizedCodeRecord? {
    val record = records.getAndRemove(code) ?: return null
    return record.takeIf { Clock.System.now() <= it.expiresAt }
}
```

`getAndRemove()` により、
1人目の Holder が Token Request を行うと、
同じ Pre-Authorized Code は削除されます。

確認結果：

```text
Holder A → 発行成功
Holder B → HTTP 400 / invalid_grant
```

また、Credential Request 時には Issuance Session も
`claimSession()` により処理対象として確保されます。

[`ConfiguredIssuanceSessionRepository.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/ConfiguredIssuanceSessionRepository.kt)

```kotlin
override suspend fun take(sessionId: String): IssuanceSession? =
    sessions.getAndRemove(sessionId)?.let { session ->
        attachCrypto2Key(session, backfill = false).also {
            crypto2Keys.remove(sessionId)
        }
    }
```

#### 結論

Pre-Authorized Code Flow では、
同一 Credential Offer URL を複数 Holder で利用することはできません。

複数 Holder で利用する場合は、コード修正が必要です。

---

### 1.2 Authorization Code Flow

Authorization Code Flow では、
`issuerStateMode` により Session の生成方法が異なります。

デフォルトは `INCLUDE` です。

[`CredentialOfferService.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt)

```kotlin
val issuerStateMode = when (request.authMethod) {
    AuthenticationMethod.PRE_AUTHORIZED -> null
    AuthenticationMethod.AUTHORIZED ->
        request.issuerStateMode ?: IssuerStateMode.INCLUDE
}
```

---

#### issuerStateMode = INCLUDE

Credential Offer 作成時の `sessionId` が
`issuer_state` として Offer に設定されます。

```kotlin
CredentialOffer.withAuthorizationCodeGrant(
    credentialIssuer = issuerBaseUrl(),
    credentialConfigurationIds =
        listOf(profile.credentialConfigurationId),
    issuerState =
        sessionId.takeIf {
            issuerStateMode == IssuerStateMode.INCLUDE
        },
)
```

Authorization Request 時は、
`issuer_state` から既存の Issuance Session を取得します。

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

そのため、以下の構成になります。

```text
1 Credential Offer URL
        ↓
1 issuer_state
        ↓
1 Issuance Session
        ↓
Authorization Flow
        ↓
Authorization Code
        ↓
Credential Issuance
```

同一 Offer を複数 Holder で利用した場合も、
同じ Issuance Session を参照します。

そのため、複数 Holder 利用には適していません。

---

#### issuerStateMode = OMIT

`OMIT` の場合、Credential Offer には `issuer_state` が含まれません。

Authorization Request 時に `issuer_state` が存在しない場合は、
新しい Issuance Session が生成されます。

[`OpenId4VciProtocolService.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/openid4vci/OpenId4VciProtocolService.kt)

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

新しい Session は UUID で生成されます。

```kotlin
IssuanceSession(
    sessionId = UUID.randomUUID().toString(),
    ...
)
```

そのため、構造上は以下のようになります。

```text
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

Authorization Code 自体は一度だけ利用可能です。

[`ConfiguredAuthorizationCodeRepository.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/repository/openid4vci/ConfiguredAuthorizationCodeRepository.kt)

```kotlin
override suspend fun consume(code: String): AuthorizationCodeRecord? {
    val record = records.getAndRemove(code) ?: return null
    return record.takeIf { Clock.System.now() <= it.expiresAt }
}
```

#### 確認結果

`issuerStateMode = OMIT` で同一 Offer を複数 Holder に利用したところ、

```text
Holder A → 発行成功
Holder B → Credential Request で失敗
```

となりました。

エラー：

```text
HTTP 400
invalid_credential_request
```

Authorization Request ごとに新しい Session を生成する実装になっていますが、
複数 Holder での一連の発行処理については、
引き続き確認が必要です。

#### 結論

```text
INCLUDE
→ 同じ Issuance Session を利用
→ 複数 Holder 利用には適さない

OMIT
→ Authorization Request ごとに新しい Session を生成
→ 複数 Holder 向けの構成は可能
→ ただし、現時点では2人目の Credential Request が失敗
```

---

## 2. Presentation Request URL

### 現状

Verifier API2 では、Presentation Response の処理開始時に
Verification Session を `claimForProcessingWithOriginal()` で確保します。

[`VerificationSessionRepository.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-verifier-api2/src/main/kotlin/id/walt/verifier2/VerificationSessionRepository.kt)

```kotlin
if (
    current.session.attempted ||
    status.successful != null ||
    status in setOf(
        Verification2Session.VerificationSessionStatus.VALIDATING_RECEIVED_REQUEST,
        Verification2Session.VerificationSessionStatus.PROCESSING_FLOW,
    )
) {
    throw VerificationSessionAlreadyUsedException(sessionId)
}
```

同じ Verification Session が処理中または処理済みの場合は、
再度 Presentation Response を受け付けません。

```kotlin
class VerificationSessionAlreadyUsedException(sessionId: String) :
    WebException(
        409,
        "Verification session '$sessionId' is already processing or complete"
    )
```

Presentation Request 自体は複数回取得できますが、
同じ Verification Session に対する Presentation Response の処理は
1回を前提としています。

### 結論

```text
1 Presentation Request URL
        ↓
1 Verification Session
        ↓
1 Verification Flow
```

同一 Presentation Request URL を複数 Holder で利用する場合は、
コード修正が必要です。

---

## 3. 複数 Holder 対応

想定要件：

```text
Credential Offer URL
        ↓
Holder A
Holder B
Holder C
```

```text
Presentation Request URL
        ↓
Holder A
Holder B
Holder C
```

現時点の整理：

```text
Pre-Authorized Code Flow
→ 複数 Holder 利用不可
→ コード修正が必要

Authorization Code Flow / INCLUDE
→ 同じ Issuance Session を利用
→ 複数 Holder 利用には適さない

Authorization Code Flow / OMIT
→ Authorization Request ごとに新しい Session を生成
→ 複数 Holder 利用について引き続き確認が必要

Presentation Request
→ 1 Verification Session / 1 Verification Flow
→ 複数 Holder 利用にはコード修正が必要
```

具体的な修正方法については、別途検討します。
