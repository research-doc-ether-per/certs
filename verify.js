private fun detectServiceName(app: Application? = null): String {

    // ---- 1) 環境変数 ----
    val env = System.getenv()
    val envKeys = listOf(
        "WALT_SERVICE_NAME",
        "SERVICE_NAME",
        "APP_NAME",
        "OTEL_SERVICE_NAME",
        "KC_SERVICE",
    )

    println("---- Service name detection (env) ----")
    envKeys.forEach { key ->
        println("ENV $key = ${env[key]}")
    }

    envKeys.firstOrNull { !env[it].isNullOrBlank() }?.let { key ->
        val value = env[key]!!.trim()
        println("Service name resolved from ENV: $key = $value")
        return value
    }

    // ---- 2) JVM system properties ----
    val syspropKeys = listOf(
        "walt.service.name",
        "service.name",
        "app.name",
        "otel.service.name",
    )

    println("---- Service name detection (sysprops) ----")
    syspropKeys.forEach { key ->
        println("SYS $key = ${System.getProperty(key)}")
    }

    syspropKeys.firstOrNull { !System.getProperty(it).isNullOrBlank() }?.let { key ->
        val value = System.getProperty(key).trim()
        println("Service name resolved from SYS PROP: $key = $value")
        return value
    }

    // ---- 3) Ktor application name ----
    val ktorName = app?.environment?.config
        ?.propertyOrNull("ktor.application.name")
        ?.getString()

    println("Ktor application.name = $ktorName")

    if (!ktorName.isNullOrBlank()) {
        val value = ktorName.trim()
        println("Service name resolved from Ktor application.name = $value")
        return value
    }

    println("Service name could not be resolved from any source")
    return "unknown-service"
}


healthcheck("livez", HealthCheckRegistry {

    val serviceName = detectServiceName(this@enable)

    register("http", {
        when (KtorStatusChecker.ktorStatus) {
            KtorStatus.ServerReady ->
                HealthCheckResult.healthy("service=$serviceName status=READY")
            else ->
                HealthCheckResult.unhealthy("service=$serviceName status=${KtorStatusChecker.ktorStatus}")
        }
    }, 2.seconds, 1.seconds)
})

