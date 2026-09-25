
private val issuerService = BaseFeature(
    "issuer-service",
    "Issuer Service Implementation",
    mapOf(
        "issuer-service" to Issuer2ServiceConfig::class,
        "vc-status" to VcStatusConfig::class,
    )
)

