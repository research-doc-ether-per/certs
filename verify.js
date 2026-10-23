
// import org.jetbrains.exposed.v1.jdbc.upsert
// import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction

import org.jetbrains.exposed.v1.core.SqlExpressionBuilder.eq
import org.jetbrains.exposed.v1.jdbc.upsert
import org.jetbrains.exposed.v1.jdbc.update
import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction




// ── DIDs ──────────────────────────────────────────────────────────────

// val dids = sourceConn.queryWithWalletParam(
//     "SELECT did, document FROM wallet_dids WHERE wallet = ?", walletParam
// ) { rs -> rs.getString("did") to rs.getString("document") }

// for ((did, documentStr) in dids) {
//     runCatching {
//         // 既存の DID 移行処理
//     }.onFailure { e ->
//         log.warn { "Failed to migrate DID $did for wallet $walletUuid: ${e.message}" }
//         errorCount++
//     }
// }



            // ── Default DID / Key ─────────────────────────────────────────────

            val defaultDids = sourceConn.queryWithWalletParam(
                """
                SELECT did, "keyId"
                FROM wallet_dids
                WHERE wallet = ?
                  AND "default" = true
                """.trimIndent(),
                walletParam
            ) { rs ->
                rs.getString("did") to rs.getString("keyId")
            }

            when {
                defaultDids.size > 1 -> {
                    log.warn {
                        "Multiple default DIDs found for wallet $walletUuid"
                    }
                    errorCount++
                }

                defaultDids.size == 1 -> {
                    val (defaultDid, defaultKeyId) = defaultDids.single()

                    val didExists = dids.any { it.first == defaultDid }
                    val keyExists = keys.any { it.first == defaultKeyId }

                    if (!didExists || !keyExists) {
                        log.warn {
                            "Default DID or Key not found for wallet $walletUuid"
                        }
                        errorCount++
                    } else {
                        runCatching {
                            if (!dryRun) {
                                suspendTransaction(targetDb) {
                                    Wallet2Tables.Wallets.update({
                                        Wallet2Tables.Wallets.id eq walletUuid
                                    }) {
                                        it[Wallet2Tables.Wallets.defaultDidId] =
                                            defaultDid
                                        it[Wallet2Tables.Wallets.defaultKeyId] =
                                            defaultKeyId
                                    }
                                }
                            }

                            log.info {
                                "Default DID/Key migrated: wallet=$walletUuid, " +
                                    "did=$defaultDid, keyId=$defaultKeyId"
                            }
                        }.onFailure { e ->
                            log.warn {
                                "Failed to migrate default DID/Key for " +
                                    "wallet $walletUuid: ${e.message}"
                            }
                            errorCount++
                        }
                    }
                }

                else -> {
                    log.info {
                        "No default DID configured for wallet $walletUuid"
                    }
                }
            }
