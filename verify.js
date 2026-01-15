WALLET_DB_JDBC_URL=jdbc:sqlserver://${POSTGRES_DB_HOST}:${MSSQL_DB_PORT};databaseName=${DB_NAME};encrypt=true;trustServerCertificate=true

val svc = runCatching { serviceString }.getOrNull().orEmpty()


import id.walt.commons.config.statics.ServiceConfig.serviceString
import java.sql.DriverManager
import kotlin.time.Duration.Companion.seconds

healthcheck("livez", HealthCheckRegistry {

    val svc = runCatching { serviceString }.getOrNull().orEmpty()

    register("http", {

        println("livez(http): serviceString=$svc, ktorStatus=${KtorStatusChecker.ktorStatus}")

        when (KtorStatusChecker.ktorStatus) {
            KtorStatus.ServerReady ->
                HealthCheckResult.healthy("$svc - READY")
            else ->
                HealthCheckResult.unhealthy("$svc - NOT_READY (${KtorStatusChecker.ktorStatus})")
        }
    }, 2.seconds, 1.seconds)

    if (svc.startsWith("walt.id wallet") || svc.contains(" wallet ")) {

        register("db", {

            val jdbcUrl =
                System.getenv("WALLET_DB_JDBC_URL")
                    ?: System.getenv("JDBC_URL")
                    ?: System.getenv("DB_URL")

            val user =
                System.getenv("WALLET_DB_USER")
                    ?: System.getenv("DB_USERNAME")
                    ?: System.getenv("DB_USER")

            val pass =
                System.getenv("WALLET_DB_PASSWORD")
                    ?: System.getenv("DB_PASSWORD")

            println("livez(db): serviceString=$svc")
            println("livez(db): jdbcUrl=$jdbcUrl")
            println("livez(db): user=$user")

            if (jdbcUrl.isNullOrBlank()) {
                return@register HealthCheckResult.unhealthy("db jdbc url not set (WALLET_DB_JDBC_URL)")
            }

            try {
                DriverManager.getConnection(jdbcUrl, user, pass).use { conn ->
                    if (conn.isValid(2)) {
                        HealthCheckResult.healthy("db ok")
                    } else {
                        HealthCheckResult.unhealthy("db connection invalid")
                    }
                }
            } catch (e: Throwable) {
                HealthCheckResult.unhealthy("db error: ${e::class.simpleName}: ${e.message}")
            }
        }, 2.seconds, 1.seconds)
    }
})
