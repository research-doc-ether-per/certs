package id.walt.issuer2.service.status

import id.walt.issuer2.config.VcStatusConfig
import io.github.oshai.kotlinlogging.KotlinLogging
import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.headers
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.Parameters
import io.ktor.http.URLBuilder
import io.ktor.http.appendPathSegments
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

class VcStatusService(
    private val config: VcStatusConfig,
) {
    private val logger = KotlinLogging.logger {}

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val http = HttpClient {
        install(ContentNegotiation) {
            json(json)
        }
    }

    fun isEnabled(): Boolean = config.enabled

    suspend fun buildCredentialStatus(
        issuerDid: String,
        credentialType: String,
        credentialId: String,
    ): JsonElement? {
        if (!config.enabled) {
            return null
        }

        require(issuerDid.isNotBlank()) {
            "issuerDid must not be blank"
        }

        require(credentialType.isNotBlank()) {
            "credentialType must not be blank"
        }

        require(credentialId.isNotBlank()) {
            "credentialId must not be blank"
        }

        logger.debug {
            "VC Status assignment start: issuerDid=$issuerDid, " +
                "credentialType=$credentialType, credentialId=$credentialId"
        }

        val accessToken = getKeycloakAccessToken()

        val assignResults = assignBslIndex(
            accessToken = accessToken,
            issuerDid = issuerDid,
            credentialType = credentialType,
            credentialId = credentialId,
        )

        val credentialStatus = createCredentialStatus(
            issuerDid = issuerDid,
            assignResults = assignResults,
        )

        logger.debug {
            "VC Status assignment completed: $credentialStatus"
        }

        return credentialStatus
    }

    private suspend fun getKeycloakAccessToken(): String {
        logger.debug {
            "Getting Keycloak access token: ${config.authentication.tokenUrl}"
        }

        val response = http.submitForm(
            url = config.authentication.tokenUrl,
            formParameters = Parameters.build {
                append(
                    "grant_type",
                    "client_credentials",
                )
                append(
                    "client_id",
                    config.authentication.clientId,
                )
                append(
                    "client_secret",
                    config.authentication.clientSecret,
                )
            },
        )

        val body = response.bodyAsText()

        if (!response.status.isSuccess()) {
            throw IllegalStateException(
                "Keycloak token API failed: " +
                    "${response.status.value} - $body"
            )
        }

        val responseJson = try {
            json.parseToJsonElement(body).jsonObject
        } catch (e: Exception) {
            throw IllegalStateException(
                "Invalid Keycloak token response: $body",
                e,
            )
        }

        return responseJson["access_token"]
            ?.jsonPrimitive
            ?.content
            ?: throw IllegalStateException(
                "access_token not found in Keycloak token response"
            )
    }

    private suspend fun assignBslIndex(
        accessToken: String,
        issuerDid: String,
        credentialType: String,
        credentialId: String,
    ): JsonArray {
        val assignEndpoint = buildAssignEndpoint(
            issuerDid = issuerDid,
        )

        val postBody = buildJsonObject {
            put("vc_type", credentialType)
            put("vc_id", credentialId)
        }

        logger.debug {
            "Assign BSL index: endpoint=$assignEndpoint, body=$postBody"
        }

        val response = http.post(assignEndpoint) {
            headers {
                append(
                    HttpHeaders.Authorization,
                    "Bearer $accessToken",
                )
            }

            contentType(ContentType.Application.Json)
            setBody(postBody.toString())
        }

        val body = response.bodyAsText()

        if (!response.status.isSuccess()) {
            throw IllegalStateException(
                "Assign index API failed: " +
                    "${response.status.value} - $body"
            )
        }

        return try {
            json.parseToJsonElement(body).jsonArray
        } catch (e: Exception) {
            throw IllegalStateException(
                "Invalid assignIndex response: $body",
                e,
            )
        }
    }

    private fun buildAssignEndpoint(
        issuerDid: String,
    ): String {
        val pathSegments = config.api.allocatePath
            .trim('/')
            .split('/')
            .filter { it.isNotBlank() }

        val builder = URLBuilder(
            config.api.baseUrl.trimEnd('/')
        )

        pathSegments.forEach { segment ->
            if (segment == "{issuer_did}") {
                builder.appendPathSegments(issuerDid)
            } else {
                builder.appendPathSegments(segment)
            }
        }

        return builder.buildString()
    }

    private fun createCredentialStatus(
        issuerDid: String,
        assignResults: JsonArray,
    ): JsonElement? {
        val credentialStatusArray = buildJsonArray {
            assignResults.forEach { element ->
                val obj = element.jsonObject

                val statusPurpose =
                    obj["statusPurpose"]
                        ?.jsonPrimitive
                        ?.content
                        ?: return@forEach

                if (statusPurpose != "revocation") {
                    return@forEach
                }

                val bslVcUrl =
                    obj["bslVcUrl"]
                        ?.jsonPrimitive
                        ?.content
                        ?: throw IllegalStateException(
                            "bslVcUrl not found in assignIndex response"
                        )

                val statusListIndex =
                    obj["index"]
                        ?.jsonPrimitive
                        ?.content
                        ?: throw IllegalStateException(
                            "index not found in assignIndex response"
                        )

                val statusListCredential =
                    buildStatusListCredentialUrl(
                        issuerDid = issuerDid,
                        bslVcUrl = bslVcUrl,
                    )

                add(
                    buildJsonObject {
                        put(
                            "id",
                            JsonPrimitive(
                                "$statusListCredential#$statusListIndex"
                            ),
                        )
                        put(
                            "type",
                            JsonPrimitive(
                                "BitstringStatusListEntry"
                            ),
                        )
                        put(
                            "statusPurpose",
                            JsonPrimitive(statusPurpose),
                        )
                        put(
                            "statusListIndex",
                            JsonPrimitive(statusListIndex),
                        )
                        put(
                            "statusListCredential",
                            JsonPrimitive(statusListCredential),
                        )
                        put(
                            "statusSize",
                            JsonPrimitive(1),
                        )
                    }
                )
            }
        }

        if (credentialStatusArray.isEmpty()) {
            logger.warn {
                "No revocation status entry returned from assignIndex"
            }

            return null
        }

        return credentialStatusArray
    }

    private fun buildStatusListCredentialUrl(
        issuerDid: String,
        bslVcUrl: String,
    ): String =
        URLBuilder(config.api.baseUrl.trimEnd('/'))
            .appendPathSegments(
                "issuers",
                issuerDid,
                "bsl",
                "vcUrls",
                bslVcUrl,
                "credential",
            )
            .buildString()
}
