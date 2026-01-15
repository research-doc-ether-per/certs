private fun safeServiceString(): String =
    runCatching { serviceString }
        .getOrNull()
        ?.takeIf { it.isNotBlank() }
        ?: "unknown-service"

val svc = safeServiceString()
println("livez: serviceString=$svc, ktorStatus=${KtorStatusChecker.ktorStatus}")


healthcheck("livez", HealthCheckRegistry {

    register("http", {

        val svc = try {
            serviceString
        } catch (e: Throwable) {
            "unknown-service"
        }

        println("livez: serviceString=$svc, ktorStatus=${KtorStatusChecker.ktorStatus}")

        when (KtorStatusChecker.ktorStatus) {
            KtorStatus.ServerReady ->
                HealthCheckResult.healthy("$svc - READY")
            else ->
                HealthCheckResult.unhealthy("$svc - NOT_READY (${KtorStatusChecker.ktorStatus})")
        }
    }, 2.seconds, 1.seconds)
})
