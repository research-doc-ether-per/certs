val underlyingPersistence: Persistence<V> = run {
    println(
        """
        [ConfiguredPersistence INIT]
        discriminator = $discriminator
        defaultExpiration = $defaultExpiration
        config.type = ${config.type}
        """.trimIndent()
    )

    when (config.type) {
        "memory" -> {
            println("[Persistence Type] Using InMemoryPersistence")
            InMemoryPersistence(discriminator, defaultExpiration)
        }

        "redis", "redis-cluster" -> {
            check(config.nodes != null) {
                "Redis persistence requires defining at least 1 node!"
            }

            println("[Persistence Type] Using RedisPersistence")
            println("Redis nodes = ${config.nodes}")

            val nodes = config.nodes
                .map { HostAndPort(it.host, it.port) }
                .toSet()
                .toMutableSet()

            val jedis: UnifiedJedis =
                if (config.type == "redis")
                    JedisPooled(nodes.first().host, nodes.first().port, config.user, config.password)
                else
                    JedisCluster(nodes, config.user, config.password)

            RedisPersistence(discriminator, defaultExpiration, encoding, decoding, jedis)
        }

        else -> throw IllegalArgumentException("Unknown persistence type ${config.type}")
    }
}
