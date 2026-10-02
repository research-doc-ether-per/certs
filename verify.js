### 9.2.6 Credential の取得・マッチング処理

Wallet2 では、Presentation Request から取得した DCQL Query を使用して、
Wallet 内に保存されている Credential を取得し、DCQL の条件に基づいてマッチングを行います。

Credential Matching では、
`vc_policies`、`specific_vc_policies`、`vp_policies` は参照されません。

Credential の取得・選択は DCQL の条件に基づいて行われ、
Policy による検証は Presentation Response が Verifier2 に送信された後に実行されます。

Credential Matching と Policy Verification の違いは以下のとおりです。

| 処理 | 使用する設定 |
|---|---|
| Credential の取得・マッチング | DCQL |
| Credential の内容検証 | `vc_policies` / `specific_vc_policies` |
| Presentation の検証 | `vp_policies` |

Credential の取得・マッチング処理の流れは以下のとおりです。

```text
Presentation Request URL
        ↓
resolve-request
        ↓  Presentation Request URL を解析
Authorization Request
        ↓  client_id / nonce / response_uri / dcql_query を取得
dcql_query
        ↓  提示対象 Credential の条件を定義
match-credentials-from-store
        ↓  Wallet 内の Credential を取得してマッチング
Wallet Credential Store
        ↓  保有 Credential を取得
RawDcqlCredential
        ↓  DCQL Matching 用の形式に変換
DcqlMatcher.match()
        ↓  format / meta / trusted_authorities / claims を判定
        ↓  credential_sets の組み合わせ条件を確認
Matching Result
        ↓  Query ID ごとの一致 Credential を返却
```

#### 9.2.6.1 Wallet 内の Credential を取得

取得した DCQL Query を以下の API に渡し、
Wallet 内に保存されている Credential とマッチングします。

```text
POST /wallet/{walletId}/credentials/present/match-credentials-from-store
```

Route 側では Wallet を取得した後、
`WalletPresentationHandler.matchCredentialsFromStore()` を呼び出します。

```kotlin
post("/match-credentials-from-store") {
    val wallet =
        call.resolveOrRespond(resolver, getAccountId)
            ?: return@post

    val req =
        call.receive<MatchCredentialsFromStoreRequest>()

    call.respond(
        WalletPresentationHandler.matchCredentialsFromStore(
            wallet,
            req
        )
    )
}
```

- [`Wallet2RouteHandler.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vc-wallet-server/src/main/kotlin/id/walt/wallet2/server/handlers/Wallet2RouteHandler.kt): `resolve-request`、`match-credentials-from-store` など Wallet API2 の Presentation API

#### 9.2.6.2 Credential Store から Credential を取得

`WalletPresentationHandler.matchCredentialsFromStore()` では、
Wallet の Credential Store から Credential を取得し、
DCQL のマッチングに使用できる `RawDcqlCredential` に変換します。

```kotlin
suspend fun matchCredentialsFromStore(
    wallet: Wallet,
    request: MatchCredentialsFromStoreRequest
): MatchCredentialsResult {

    val idByIndex = mutableMapOf<String, String>()
    val rawCredentials = mutableListOf<RawDcqlCredential>()
    var idx = 0

    wallet.streamAllCredentials().collect { stored ->
        val key = idx.toString()

        idByIndex[key] = stored.id
        rawCredentials +=
            stored.credential.toRawDcqlCredential(key)

        idx++
    }

    if (rawCredentials.isEmpty()) {
        return MatchCredentialsResult(
            emptyList(),
            0,
            emptyMap()
        )
    }

    val matched =
        DcqlMatcher.match(
            request.dcqlQuery,
            rawCredentials
        ).getOrThrow()

    return buildMatchResult(
        matched,
        idByIndex
    )
}
```

この処理では、Wallet 内の Credential を取得した後、
Credential 自体を Policy で検証するのではなく、
`DcqlMatcher.match()` に渡して DCQL の条件と照合します。

- [`WalletPresentationHandler.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vc-wallet/src/commonMain/kotlin/id/walt/wallet2/handlers/WalletPresentationHandler.kt): Presentation Request の解析、Credential Store からの取得、DCQL Matcher の呼び出し

#### 9.2.6.3 DCQL による Credential Matching

実際の Credential Matching は `DcqlMatcher.kt` で行われます。

```kotlin
fun match(
    query: DcqlQuery,
    availableCredentials: List<DcqlCredential>,
    ...
): Result<Map<String, List<DcqlMatchResult>>>
```

まず、`credentials[]` に定義された各 `CredentialQuery` に対して、
Wallet 内の Credential を順番に照合します。

```kotlin
for (credentialQuery in query.credentials) {

    val potentialMatchesByFormat =
        availableCredentials.filter {
            it.format in credentialQuery.format.id
        }

    for (credential in potentialMatchesByFormat) {

        val metaCheck =
            matchesMeta(
                credential,
                credentialQuery.meta ?: NoMeta,
                credentialQuery.format
            )

        if (!metaCheck) {
            continue
        }

        val authoritiesCheck =
            matchesTrustedAuthorities(
                credential,
                credentialQuery.trustedAuthorities,
                trustedAuthoritiesChecker
            )

        if (!authoritiesCheck) {
            continue
        }

        val claimsMatchResult =
            matchesClaimsAndGetSelected(
                credential,
                credentialQuery.claims,
                credentialQuery.claimSets
            )

        // ...
    }
}
```

各 Credential Query のマッチングでは、主に以下の条件を使用します。

| DCQL 条件 | マッチング内容 |
|---|---|
| `format` | Credential Format が一致するか |
| `meta.type_values` | JWT VC の `type` が条件を満たすか |
| `meta.vct_values` | SD-JWT VC の `vct` が条件を満たすか |
| `trusted_authorities` | Credential の発行元等が信頼条件を満たすか（checker が設定されている場合） |
| `claims` / `claim_sets` | 必要な claim および claim の組み合わせ条件を満たすか |

各 Credential Query のマッチング後、`credential_sets` が設定されている場合は、
マッチした Query ID の組み合わせ条件を確認します。

- [`DcqlMatcher.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-dcql/src/commonMain/kotlin/id/walt/dcql/DcqlMatcher.kt): `format`、`type_values`、`vct_values`、`trusted_authorities`、`claims`、`credential_sets` のマッチング処理

##### 9.2.6.3.1 `type_values` / `vct_values` のマッチング

JWT VC の場合は、Credential の `type` と
DCQL の `meta.type_values` を比較します。

```kotlin
metaQuery.typeValues.any { requiredTypeSet ->
    requiredTypeSet.all { requiredType ->
        credTypes.contains(requiredType)
    }
}
```

SD-JWT VC の場合は、Credential の `vct` と
DCQL の `meta.vct_values` を比較します。

```kotlin
val vctClaim =
    credential.data["vct"]
        ?.jsonPrimitive
        ?.contentOrNull

metaQuery.vctValues.contains(vctClaim)
```

したがって、Credential の取得・マッチング時には Policy の内容ではなく、
DCQL に定義された Credential Format、Type、VCT、claims などが使用されます。

- [`DcqlMatcher.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-dcql/src/commonMain/kotlin/id/walt/dcql/DcqlMatcher.kt)

##### 9.2.6.3.2 `credential_sets` の確認

各 `CredentialQuery` のマッチング後、
`credential_sets` が設定されている場合は、
マッチした Query ID の組み合わせが条件を満たしているかを確認します。

```kotlin
query.credentialSets?.let { sets ->
    val satisfied =
        checkCredentialSets(
            sets,
            finalIndividualMatches.keys
        )

    if (!satisfied) {
        val errorMsg =
            "Required credential set constraints not met."

        return Result.failure(
            DcqlMatchException(errorMsg)
        )
    }
}
```

処理順は以下のとおりです。

```text
credentials[]
        ↓
各 CredentialQuery をマッチング
        ↓
matched Query IDs
        ↓
credential_sets
        ↓
AND / OR の組み合わせ条件を確認
```

そのため、`credential_sets` は Credential Store を直接検索する条件ではなく、
各 Credential Query のマッチング結果に対する組み合わせ条件として使用されます。

- [`DcqlMatcher.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-dcql/src/commonMain/kotlin/id/walt/dcql/DcqlMatcher.kt)
