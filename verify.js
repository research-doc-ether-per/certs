### 4.2.7 issuer-api2 冗長化について

Issuer API2 では、Session や Authorization Code などの状態管理に
`ConfiguredPersistence` が使用されています。

`ConfiguredPersistence` では、以下の Persistence を切り替えることができます。

- `memory`
- `redis`
- `redis-cluster`

デフォルトの [`persistence.conf`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/docker-compose/issuer-api2/config/persistence.conf) では `memory` が設定されています。

```hocon
type = "memory"
// type = "redis"
// nodes = [{host = "127.0.0.1", port = 6379}]
```

[`ConfiguredPersistence.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-service-commons/src/main/kotlin/id/walt/commons/persistence/ConfiguredPersistence.kt) では、設定された `type` に応じて
InMemory / Redis の実装が切り替えられます。

```kotlin
val underlyingPersistence: Persistence<V> = when (config.type) {
    "memory" -> InMemoryPersistence(discriminator, defaultExpiration)

    "redis", "redis-cluster" -> {
        // check(encoding != null && decoding != null) { "Redis persistence requires encoding and decoding function!" }
        check(config.nodes != null) { "Redis persistence requires defining at least 1 node!" }

        val nodes = config.nodes.map { HostAndPort(it.host, it.port) }.toSet().toMutableSet()
        if (config.type == "redis") check(config.nodes.size == 1) {
            "For none clustered Redis, exactly 1 node is required (have ${config.nodes.size})!"
        }

        val jedis: UnifiedJedis = when (config.type) {
            "redis" -> JedisPooled(
                nodes.first().host,
                nodes.first().port,
                config.user,
                config.password
            )

            else -> JedisCluster(
                nodes,
                config.user,
                config.password
            )
        }

        RedisPersistence(
            discriminator,
            defaultExpiration,
            encoding,
            decoding,
            jedis
        )
    }

    else -> throw IllegalArgumentException(
        "Unknown persistence type ${config.type}"
    )
}
```

そのため、複数の Issuer API2 インスタンスでは、同一 Redis / Valkey を参照して Session を共有する構成と、Issuer ごとに Redis / Valkey を分けて Session を分離する構成の両方が可能です。

```text
Session を共有する場合: 

Issuer API2 #1 ─┐
                ├─ Redis / Valkey A
Issuer API2 #2 ─┘


Session を分離する場合: 

Issuer API2 #1 ── Redis / Valkey A

Issuer API2 #2 ── Redis / Valkey B
```

Issuer API2 は v1.0.0 の標準機能として、
複数インスタンス間で状態を共有するための
Redis / Redis Cluster 対応の Persistence 機能を持っています。

#### Redis 対応確認

`persistence.conf` を Redis に変更し、
Issuer API2 から Valkey への書き込みを確認済みです。

- ローカル変更ファイル

```text
docker-compose/issuer-api2/config/_features.conf
docker-compose/issuer-api2/config/persistence.conf
docker-compose/.env
docker-compose/docker-compose.yaml
```

- 主な変更内容

```text
_features.conf
└─ persistence を有効化

persistence.conf
└─ memory → redis

.env
├─ ISSUER_VALKEY_HOST
└─ ISSUER_VALKEY_PORT

docker-compose.yaml
├─ issuer-valkey を追加
└─ issuer-api2 → issuer-valkey の depends_on を追加
```

- Redis / Valkey の状態は、以下のコマンドで確認できます。
```bash
docker exec -it issuer-valkey valkey-cli -p 6380 KEYS "*"
```
※ Session や Pre-Authorized Code などの一時データは、
処理中に `getAndRemove()` で取得と同時に削除される場合があるため、
フロー完了後には Key が残っていないことがあります。


### 9.2.8 verifier-api2 冗長化について

Verifier API2 では、Verification Session の管理が
[`VerificationSessionRepository`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-verifier-api2/src/main/kotlin/id/walt/verifier2/VerificationSessionRepository.kt)
として抽象化されています。

```kotlin
interface VerificationSessionRepository {
    suspend fun create(session: Verification2Session): VerificationSessionSnapshot
    suspend fun get(sessionId: String): VerificationSessionSnapshot?
    suspend fun compareAndSet(
        sessionId: String,
        expectedVersion: Long,
        session: Verification2Session,
    ): VerificationSessionSnapshot
    suspend fun delete(sessionId: String): Boolean
}
```

v1.0.0 で標準提供されている実装は
[`InMemoryVerificationSessionRepository`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-verifier-api2/src/main/kotlin/id/walt/verifier2/VerificationSessionRepository.kt#L84)
です。

```kotlin
class InMemoryVerificationSessionRepository :
    VerificationSessionRepository {

    private val sessions =
        mutableMapOf<String, VerificationSessionSnapshot>()

    ...
}
```

また、[`OSSVerifier2Service`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-verifier-api2/src/main/kotlin/id/walt/verifier2/OSSVerifier2Service.kt)
では、デフォルト Repository として
`InMemoryVerificationSessionRepository` が設定されています。

```kotlin
val defaultSessionRepository:
    VerificationSessionRepository =
        InMemoryVerificationSessionRepository()
```

通常起動時の [`Main.kt`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-verifier-api2/src/main/kotlin/id/walt/verifier2/Main.kt)
でも別 Repository は渡されていません。

```kotlin
fun Application.verifierApi() {
    routing {
        Verifier2Service.run { registerRoute() }
    }
}
```

そのため、Verification Session は各 Verifier API2 プロセス内のメモリに保存されます。

```text
Verifier API2 #1
└─ Memory #1

Verifier API2 #2
└─ Memory #2
```

複数インスタンス間では Session が共有されないため、
別インスタンスに後続リクエストが振り分けられた場合、
作成済みの Verification Session を取得できません。

#### Redis 対応確認

Verifier API2 については、
Redis / Valkey を使用して Verification Session を共有するための
対応方法を確認済みです。

Issuer API2 と同様に `ConfiguredPersistence` を利用し、
Redis / Valkey 対応の
`ConfiguredVerificationSessionRepository` を追加する方針です。

```text
VerificationSessionRepository
        ↓
ConfiguredVerificationSessionRepository
        ↓
ConfiguredPersistence
        ↓
memory / redis / redis-cluster
```

ただし、Verifier API2 では、複数の処理が同じ Session を同時に更新した場合に、
古いデータで上書きされないようにする必要があります。

そのため、Redis を利用する場合も、
Version を確認してから安全に更新する仕組みが必要です。

現在は Redis 対応方法の確認まで完了しており、
Repository の実装と動作確認を進めています。

- ローカル変更対象ファイル

```text
waltid-services/waltid-verifier-api2/
src/main/kotlin/id/walt/verifier2/
VerificationSessionRepository.kt

waltid-services/waltid-verifier-api2/
src/main/kotlin/id/walt/verifier2/
ConfiguredVerificationSessionRepository.kt

waltid-services/waltid-verifier-api2/
src/main/kotlin/id/walt/verifier2/
Main.kt

docker-compose/verifier-api2/config/_features.conf
docker-compose/verifier-api2/config/persistence.conf
docker-compose/.env
docker-compose/docker-compose.yaml
```

- 主な変更内容

```text
VerificationSessionRepository.kt
└─ Redis Repository から必要な共通処理を利用できるように可視性を調整

ConfiguredVerificationSessionRepository.kt
└─ 新規追加
   ├─ create
   ├─ get
   ├─ compareAndSet
   └─ delete

Main.kt
└─ ConfiguredVerificationSessionRepository を注入

_features.conf
└─ persistence を有効化

persistence.conf
└─ Redis / Valkey 接続設定

.env
├─ VERIFIER_VALKEY_HOST
└─ VERIFIER_VALKEY_PORT

docker-compose.yaml
├─ verifier-valkey を追加
└─ verifier-api2 → verifier-valkey の depends_on を追加
```
