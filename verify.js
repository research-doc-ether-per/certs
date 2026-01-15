package id.walt.webwallet.web.controllers

import id.walt.webwallet.web.WebBaseRoutes.webWalletRoute
import io.github.smiley4.ktoropenapi.get
import io.github.smiley4.ktoropenapi.route
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import kotlinx.serialization.json.*
import java.sql.DriverManager

/**
 * Ops endpoints (for Swagger-visible operational checks).
 * Note: Cohort /livez is not included in Swagger; this controller provides a Swagger-visible alternative.
 */
fun Application.opsController() {
    webWalletRoute {
        route("ops", { tags = listOf("Ops") }) {

            get("db", {
                summary = "Database connectivity check (Swagger-visible)"
                description =
                    "Checks DB connectivity using WALLET_DB_JDBC_URL / WALLET_DB_USER / WALLET_DB_PASSWORD env vars. " +
                    "Returns 200 when DB is reachable; 503 otherwise."
                response {
                    HttpStatusCode.OK to { description = "DB reachable" }
                    HttpStatusCode.ServiceUnavailable to { description = "DB unreachable or not configured" }
                }
            }) {
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

                if (jdbcUrl.isNullOrBlank()) {
                    call.respond(
                        HttpStatusCode.ServiceUnavailable,
                        buildJsonObject {
                            put("ok", false)
                            put("error", "WALLET_DB_JDBC_URL not set")
                        }
                    )
                    return@get
                }

                try {
                    DriverManager.getConnection(jdbcUrl, user, pass).use { conn ->
                        val ok = conn.isValid(2)
                        if (ok) {
                            call.respond(
                                HttpStatusCode.OK,
                                buildJsonObject {
                                    put("ok", true)
                                    put("db", "up")
                                }
                            )
                        } else {
                            call.respond(
                                HttpStatusCode.ServiceUnavailable,
                                buildJsonObject {
                                    put("ok", false)
                                    put("db", "down")
                                    put("error", "Connection isValid() returned false")
                                }
                            )
                        }
                    }
                } catch (e: Throwable) {
                    call.respond(
                        HttpStatusCode.ServiceUnavailable,
                        buildJsonObject {
                            put("ok", false)
                            put("db", "down")
                            put("error", "${e::class.simpleName}: ${e.message}")
                        }
                    )
                }
            }
        }
    }
}
