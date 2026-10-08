### 4.2.8 Credential Offer の有効期限について

Credential Offer の有効期限は、`CredentialOfferCreateRequest` の `expiresInSeconds` で指定します。

コード上の定義位置: [`CredentialOfferModels.kt#L40`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/models/CredentialOfferModels.kt#L40)

```kotlin
@Serializable
data class CredentialOfferCreateRequest(
    // ...
    // デフォルト値: 5分（300秒）
    val expiresInSeconds: Long = 5.minutes.inWholeSeconds,
    // ...
)
```

実際に有効期限を計算する位置: [`CredentialOfferService.kt#L39`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-issuer-api2/src/main/kotlin/id/walt/issuer2/service/CredentialOfferService.kt#L39)

```kotlin
// ...
val sessionId = request.sessionId ?: UUID.randomUUID().toString()
val expiresAt = expirationTimestamp(request.expiresInSeconds)
// ...
```

Credential Offer 作成時、`expiresInSeconds` の指定方法:

```js
const params = {
  profileId,
  authMethod,
  valueMode,

  // `expiresInSeconds: -1` を指定すると無期限として扱われます。
  expiresInSeconds: 8 * 60, // 8分
}
```


### 9.2.10 Presentation Request URL の有効期限

Presentation Request に関連する Verification Session の有効期限は、 Verifier2 の `core_flow` 内で指定します。

指定方法は以下の2つです。

```text
expiration_duration
→ 現在時刻からどのくらい後に期限切れにするか

expiration_date
→ いつ期限切れにするか
```

`expiration_duration` と `expiration_date` は、どちらも設定上のデフォルト値は `null` です。

ただし、両方とも指定しない場合、未使用の Verification Session は `persistenceExpirationDate()` により作成時刻から10分後に期限切れとして扱われます。

両方を指定した場合は、 `expiration_date` が優先されます。


コード上の定義位置: [`VerificationSessionSetupData.kt#L44`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vp-verifier/src/commonMain/kotlin/id/walt/verifier2/data/VerificationSessionSetupData.kt#L44)

```kotlin
// ...
/** Expiration duration in ISO-8601 duration format. Used to calculate expiration date. */
@SerialName("expiration_duration")
val expirationDuration: Duration? = null,

/** Expiration date (takes precedence over expiration_duration if both set) */
@SerialName("expiration_date")
val expirationDate: Instant? =
    expirationDuration?.let { Clock.System.now().plus(it) },
// ...
```

実際のデフォルト期限の判定位置: [`Verification2Session.kt#L147`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vp-verifier/src/commonMain/kotlin/id/walt/verifier2/data/Verification2Session.kt#L147)

```kotlin
// ...
fun persistenceExpirationDate(): Instant =
    if (attempted || status in setOf(VerificationSessionStatus.SUCCESSFUL, VerificationSessionStatus.FAILED)) retentionDate
    else expirationDate ?: creationDate.plus(10, DateTimeUnit.MINUTE, TimeZone.UTC)
// ...
```

実際に Verification Session に設定する位置: [`VerificationSessionCreator.kt#L466`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vp-verifier/src/jvmMain/kotlin/id/walt/verifier2/handlers/sessioncreation/VerificationSessionCreator.kt#L466)

```kotlin
// ...
val now = Clock.System.now()
val expiration = setup.core.expirationDate
// ...
```

その後、Verification Session 作成時に設定されます。

```kotlin
val newSession = Verification2Session(
    // ...
    creationDate = now,
    expirationDate = expiration,
    // ...
)
```

Presentation Request 作成時、`expiration_duration` の指定方法:

```js
const createSessionParams = {
  flow_type: 'cross_device',
  core_flow: {
    // Verification Session 作成時点から8分後に期限切れ
    expiration_duration: 'PT8M',

    // 指定した日時に期限切れ
    // expiration_date: '2026-10-08T06:30:00Z',

    dcql_query: {
      // ...
    },

    policies: {
      // ...
    },
  },
}
```

#### 補足

`expiration_duration` を使用する場合は、ISO-8601 Duration 形式で指定します。

```text
PT5M  = 5分
PT8M  = 8分
PT10M = 10分
PT30M = 30分
PT1H  = 1時間
```
