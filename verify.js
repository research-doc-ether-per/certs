import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

private val deferredCredentialRequests = ConfiguredPersistence<CredentialRequest>(
    "deferred_credential_requests",
    defaultExpiration = (
        System.getenv("DEFERRED_EXPIRATION")
            ?.let { runCatching { Duration.parse(it) }.getOrNull() }
            ?: 5.minutes
    ),
    encoding = { Json.encodeToString(it) },
    decoding = { Json.decodeFromString(it) },
)

