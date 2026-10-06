import kotlinx.serialization.Serializable



@Serializable
data class VerificationSessionSnapshot(
    val session: Verification2Session,
    val version: Long,
)


  private fun VerificationSessionSnapshot.copyForCaller() =
    copy(session = session.copyForStorage())

internal fun VerificationSessionSnapshot.copyForCaller() =
    copy(session = session.copyForStorage())



fun Verification2Session.copyForStorage(): Verification2Session =
    repositoryJson.decodeFromString(
        repositoryJson.encodeToString(
            Verification2Session.serializer(),
            this
        )
    )


waltid-services/waltid-verifier-api2/
src/main/kotlin/id/walt/verifier2/ConfiguredVerificationSessionRepository.kt

package id.walt.verifier2

import id.walt.commons.persistence.ConfiguredPersistence
import id.walt.commons.persistence.Persistence
import id.walt.commons.persistence.RedisPersistence
import id.walt.verifier2.data.Verification2Session
import kotlinx.serialization.json.Json
import kotlin.time.Clock
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

class ConfiguredVerificationSessionRepository(
    private val sessions: Persistence<VerificationSessionSnapshot> =
        ConfiguredPersistence(
            discriminator = "verifier2_verification_sessions",
            defaultExpiration = 10.minutes,
            encoding = {
                repositoryJson.encodeToString(
                    VerificationSessionSnapshot.serializer(),
                    it
                )
            },
            decoding = {
                repositoryJson.decodeFromString(
                    VerificationSessionSnapshot.serializer(),
                    it
                )
            },
        )
) : VerificationSessionRepository {

    private val lock = Any()

    override suspend fun create(
        session: Verification2Session
    ): VerificationSessionSnapshot {

        val snapshot = VerificationSessionSnapshot(
            session = session.copyForStorage(),
            version = 0,
        )

        val ttl = ttl(session)

        redisPersistence()?.let { redis ->

            val result = redis.pool.eval(
                CREATE_SCRIPT,
                listOf(redisKey(session.id)),
                listOf(
                    encode(snapshot),
                    ttl.inWholeSeconds.coerceAtLeast(1).toString()
                )
            )

            if ((result as Number).toLong() == 0L) {
                throw DuplicateVerificationSessionException(session.id)
            }

            return snapshot.copyForCaller()
        }

        return synchronized(lock) {
            if (sessions[session.id] != null) {
                throw DuplicateVerificationSessionException(session.id)
            }

            sessions.set(
                session.id,
                snapshot,
                ttl
            )

            snapshot.copyForCaller()
        }
    }

    override suspend fun get(
        sessionId: String
    ): VerificationSessionSnapshot? {

        val snapshot = sessions[sessionId] ?: return null

        if (snapshot.session.persistenceExpirationDate() < Clock.System.now()) {
            sessions.remove(sessionId)
            return null
        }

        return snapshot.copyForCaller()
    }

    override suspend fun compareAndSet(
        sessionId: String,
        expectedVersion: Long,
        session: Verification2Session,
    ): VerificationSessionSnapshot {

        check(session.id == sessionId) {
            "Session id cannot be changed"
        }

        val newSnapshot = VerificationSessionSnapshot(
            session = session.copyForStorage(),
            version = expectedVersion + 1,
        )

        val ttl = ttl(session)

        redisPersistence()?.let { redis ->

            val result = redis.pool.eval(
                COMPARE_AND_SET_SCRIPT,
                listOf(redisKey(sessionId)),
                listOf(
                    expectedVersion.toString(),
                    encode(newSnapshot),
                    ttl.inWholeSeconds.coerceAtLeast(1).toString()
                )
            ) as List<*>

            val status = (result[0] as Number).toLong()

            when (status) {
                RESULT_NOT_FOUND -> {
                    throw VerificationSessionNotFoundException(sessionId)
                }

                RESULT_STALE -> {
                    val actualVersion =
                        (result[1] as Number).toLong()

                    throw StaleVerificationSessionException(
                        sessionId,
                        expectedVersion,
                        actualVersion,
                    )
                }

                RESULT_CORRUPTED -> {
                    throw VerificationSessionCorruptedException(
                        "Verification session '$sessionId' is corrupted"
                    )
                }

                RESULT_SUCCESS -> {
                    return newSnapshot.copyForCaller()
                }

                else -> {
                    throw VerificationSessionRepositoryUnavailableException(
                        "Unexpected Redis CAS result for session '$sessionId'"
                    )
                }
            }
        }

        return synchronized(lock) {

            val current = sessions[sessionId]
                ?: throw VerificationSessionNotFoundException(sessionId)

            if (current.version != expectedVersion) {
                throw StaleVerificationSessionException(
                    sessionId,
                    expectedVersion,
                    current.version,
                )
            }

            sessions.set(
                sessionId,
                newSnapshot,
                ttl
            )

            newSnapshot.copyForCaller()
        }
    }

    override suspend fun delete(
        sessionId: String
    ): Boolean {

        redisPersistence()?.let { redis ->
            return redis.pool.del(redisKey(sessionId)) > 0
        }

        return synchronized(lock) {
            if (sessions[sessionId] == null) {
                false
            } else {
                sessions.remove(sessionId)
                true
            }
        }
    }

    private fun ttl(
        session: Verification2Session
    ): Duration {

        val ttl =
            session.persistenceExpirationDate() - Clock.System.now()

        return if (ttl <= Duration.ZERO) {
            1.seconds
        } else {
            ttl
        }
    }

    private fun encode(
        snapshot: VerificationSessionSnapshot
    ): String =
        repositoryJson.encodeToString(
            VerificationSessionSnapshot.serializer(),
            snapshot
        )

    private fun redisKey(sessionId: String): String =
        "${sessions.discriminator}:$sessionId"

    private fun redisPersistence(): RedisPersistence<*>? {

        val underlying =
            if (sessions is ConfiguredPersistence<*>) {
                sessions.underlyingPersistence
            } else {
                sessions
            }

        return underlying as? RedisPersistence<*>
    }

    companion object {

        private const val RESULT_NOT_FOUND = -1L
        private const val RESULT_CORRUPTED = -2L
        private const val RESULT_STALE = 0L
        private const val RESULT_SUCCESS = 1L

        private val repositoryJson = Json {
            encodeDefaults = true
            ignoreUnknownKeys = true
        }

        private val CREATE_SCRIPT = """
            if redis.call('EXISTS', KEYS[1]) == 1 then
                return 0
            end

            redis.call(
                'SETEX',
                KEYS[1],
                ARGV[2],
                ARGV[1]
            )

            return 1
        """.trimIndent()

        private val COMPARE_AND_SET_SCRIPT = """
            local raw = redis.call('GET', KEYS[1])

            if not raw then
                return {-1, -1}
            end

            local ok, current = pcall(cjson.decode, raw)

            if not ok or current['version'] == nil then
                return {-2, -2}
            end

            local actualVersion =
                tonumber(current['version'])

            local expectedVersion =
                tonumber(ARGV[1])

            if actualVersion ~= expectedVersion then
                return {0, actualVersion}
            end

            redis.call(
                'SETEX',
                KEYS[1],
                ARGV[3],
                ARGV[2]
            )

            return {1, expectedVersion + 1}
        """.trimIndent()
    }
}

waltid-services/waltid-verifier-api2/
src/main/kotlin/id/walt/verifier2/Main.kt

fun Application.verifierApi() {
    routing {
        Verifier2Service.run { registerRoute() }
    }
}

fun Application.verifierApi() {

    val sessionRepository =
        ConfiguredVerificationSessionRepository()

    routing {
        Verifier2Service.run {
            registerRoute(sessionRepository)
        }
    }
}
