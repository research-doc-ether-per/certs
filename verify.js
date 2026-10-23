
// ── Default DID / Key ─────────────────────────────────────────────

println("[DEBUG] Default DID migration start: wallet=$walletUuid, dryRun=$dryRun")

val defaultDids = sourceConn.queryWithWalletParam(
    """SELECT did, "keyId" FROM wallet_dids WHERE wallet = ? AND "default" = true""",
    walletParam
) { rs -> rs.getString("did") to rs.getString("keyId") }

println("[DEBUG] Default DID count: ${defaultDids.size}")
println("[DEBUG] Default DID records: $defaultDids")
println("[DEBUG] Migrated DID count: ${dids.size}")
println("[DEBUG] Migrated Key count: ${keys.size}")

when {
    defaultDids.size > 1 -> {
        println("[ERROR] Multiple default DIDs found: wallet=$walletUuid")
        log.warn { "Multiple default DIDs found for wallet $walletUuid" }
        errorCount++
    }

    defaultDids.size == 1 -> {
        val (defaultDid, defaultKeyId) = defaultDids.single()
        val didExists = dids.any { it.first == defaultDid }
        val keyExists = keys.any { it.first == defaultKeyId }

        println("[DEBUG] defaultDid=$defaultDid")
        println("[DEBUG] defaultKeyId=$defaultKeyId")
        println("[DEBUG] didExists=$didExists, keyExists=$keyExists")

        if (!didExists || !keyExists) {
            println("[ERROR] Default DID or Key not found: wallet=$walletUuid")
            log.warn { "Default DID or Key not found for wallet $walletUuid" }
            errorCount++
        } else {
            runCatching {
                if (!dryRun) {
                    println("[DEBUG] Updating wallet2_wallets: wallet=$walletUuid")

                    val updatedRows = suspendTransaction(targetDb) {
                        Wallet2Tables.Wallets.update({ Wallet2Tables.Wallets.id eq walletUuid }) {
                            it[Wallet2Tables.Wallets.defaultDidId] = defaultDid
                            it[Wallet2Tables.Wallets.defaultKeyId] = defaultKeyId
                        }
                    }

                    println("[DEBUG] Updated wallet rows: $updatedRows")

                    if (updatedRows != 1) {
                        error("Expected 1 updated wallet, but got $updatedRows: wallet=$walletUuid")
                    }

                    println("[SUCCESS] Default DID/Key updated: wallet=$walletUuid")
                } else {
                    println("[DEBUG] Dry run: UPDATE skipped")
                }

                log.info { "Default DID/Key migrated: wallet=$walletUuid, did=$defaultDid, keyId=$defaultKeyId" }
            }.onFailure { e ->
                println("[ERROR] Failed to update Default DID/Key: ${e.message}")
                e.printStackTrace()
                log.warn { "Failed to migrate default DID/Key for wallet $walletUuid: ${e.message}" }
                errorCount++
            }
        }
    }

    else -> {
        println("[DEBUG] No default DID configured: wallet=$walletUuid")
        log.info { "No default DID configured for wallet $walletUuid" }
    }
}

println("[DEBUG] Default DID migration end: wallet=$walletUuid")
