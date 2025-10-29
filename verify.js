

## 1) `waltid-libraries/credentials/waltid-w3c-credentials/src/commonMain/kotlin/id/walt/w3c/status/CredentialStatusProvider.kt`

```kotlin
package id.walt.w3c.status

import kotlinx.serialization.json.JsonArray

/**
 * Cross-platform SPI for building `credentialStatus` after VC `id` is known.
 *
 * commonMain exposes the signature; platform-specific actual implementations
 * live under jvmMain (and can be added for other targets in the future).
 */
expect object CredentialStatusProvider {
  /**
   * Build a W3C VC `credentialStatus` JSON array (e.g. BitstringStatusListEntry[]),
   * or return null to skip writing the field.
   *
   * @param issuerDid DID (or issuer id) of the VC issuer
   * @param credentialType logical VC type (e.g. "identity", "education") used by your registry
   * @param credentialId the final VC id (MUST be resolved after mergeWithMapping)
   */
  suspend fun build(
    issuerDid: String,
    credentialType: String,
    credentialId: String
  ): JsonArray?
}
```

---

## 2) `waltid-libraries/credentials/waltid-w3c-credentials/src/jvmMain/kotlin/id/walt/w3c/status/CredentialStatusProvider.kt`

```kotlin
package id.walt.w3c.status

import io.ktor.client.HttpClient
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.forms.Parameters
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.*

/**
 * JVM implementation that talks to your VC Registry & Keycloak to:
 *  1) obtain an access token
 *  2) ensure a BSL VC of `credentialType` exists (issue if missing)
 *  3) assign a BSL index for `credentialId`
 *  4) return BitstringStatusListEntry[] as JsonArray
 *
 * Expected environment variables (adapt to your setup):
 *  - VDR_API_URL                      : VC Registry base URL
 *  - VDR_API_KEYCLOAK_ISSUER          : Keycloak base URL (issuer)
 *  - VDR_API_KEYCLOAK_REALM           : Keycloak realm
 *  - VDR_API_CLIENT_ID                : Keycloak client id
 *  - VDR_API_CLIENT_SECRET            : Keycloak client secret
 */
actual object CredentialStatusProvider {

  private val http = HttpClient {
    install(ContentNegotiation) { json() }
  }

  // --- public entry ---------------------------------------------------------
  actual suspend fun build(
    issuerDid: String,
    credentialType: String,
    credentialId: String
  ): JsonArray? {
    val env = System.getenv()
    val vcRegistryBaseUrl = env["VDR_API_URL"] ?: return null

    // 1) get token
    val accessToken = getKeycloakAccessToken()

    // 2) ensure bsl vc urls for this type
    val types = getBslUrlsByCredentialType(
      vcRegistryBaseUrl = vcRegistryBaseUrl,
      issuerDid = issuerDid,
      credentialType = credentialType
    )
    if (types.isEmpty()) {
      issueBslCredential(
        vcRegistryBaseUrl = vcRegistryBaseUrl,
        accessToken = accessToken,
        issuerDid = issuerDid,
        credentialType = credentialType
      )
    }

    // 3) assign index
    val assigned = assignBslIndex(
      vcRegistryBaseUrl = vcRegistryBaseUrl,
      accessToken = accessToken,
      issuerDid = issuerDid,
      credentialType = credentialType,
      credentialId = credentialId
    )

    // 4) map to BitstringStatusListEntry[]
    val out = assigned.map { element ->
      val obj = element.jsonObject
      val bslVcUrl = obj["bslVcUrl"]!!.jsonPrimitive.content
      val statusListIndex = obj["index"]!!.jsonPrimitive.content
      val statusPurpose = obj["statusPurpose"]!!.jsonPrimitive.content

      val actualCredentialUrl = buildString {
        append(vcRegistryBaseUrl.trimEnd('/'))
        append("/issuers/")
        append(issuerDid)
        append("/bsl/vcUrls/")
        append(bslVcUrl)
      }

      buildJsonObject {
        put("id", JsonPrimitive("$actualCredentialUrl#$statusListIndex"))
        put("type", JsonPrimitive("BitstringStatusListEntry"))
        put("statusPurpose", JsonPrimitive(statusPurpose))
        put("statusListIndex", JsonPrimitive(statusListIndex))
        put("statusListCredential", JsonPrimitive(actualCredentialUrl))
      }
    }

    return JsonArray(out)
  }

  // --- helpers --------------------------------------------------------------

  private suspend fun getKeycloakAccessToken(): String {
    val env = System.getenv()
    val baseUrl = env["VDR_API_KEYCLOAK_ISSUER"]
      ?: throw IllegalArgumentException("VDR_API_KEYCLOAK_ISSUER not set")
    val realm = env["VDR_API_KEYCLOAK_REALM"]
      ?: throw IllegalArgumentException("VDR_API_KEYCLOAK_REALM not set")
    val clientId = env["VDR_API_CLIENT_ID"]
      ?: throw IllegalArgumentException("VDR_API_CLIENT_ID not set")
    val clientSecret = env["VDR_API_CLIENT_SECRET"]
      ?: throw IllegalArgumentException("VDR_API_CLIENT_SECRET not set")

    val tokenEndpoint = "$baseUrl/realms/$realm/protocol/openid-connect/token"
    val response = http.submitForm(
      url = tokenEndpoint,
      formParameters = Parameters.build {
        append("grant_type", "client_credentials")
        append("client_id", clientId)
        append("client_secret", clientSecret)
      }
    )

    val body = response.bodyAsText()
    if (!response.status.isSuccess()) {
      throw IllegalArgumentException("Keycloak token api failed: ${'$'}{response.status} body=${'$'}body")
    }
    val json = Json.parseToJsonElement(body).jsonObject
    return json["access_token"]!!.jsonPrimitive.content
  }

  private suspend fun getBslUrlsByCredentialType(
    vcRegistryBaseUrl: String,
    issuerDid: String,
    credentialType: String
  ): MutableList<String> {
    val url = buildString {
      append(vcRegistryBaseUrl.trimEnd('/'))
      append("/issuers/")
      append(issuerDid)
      append("/bsl/vcUrls")
    }
    val response = http.get(url)
    val body = response.bodyAsText()
    if (!response.status.isSuccess()) return mutableListOf()

    val arr = Json.parseToJsonElement(body).jsonArray
    val out = mutableListOf<String>()
    for (u in arr) {
      val raw = u.jsonPrimitive.contentOrNull ?: continue
      val parts = raw.split('/')
      val t = parts.getOrNull(parts.size - 3) // .../{type}/.../status.json
      if (t == credentialType) out.add(t)
    }
    return out
  }

  private suspend fun issueBslCredential(
    vcRegistryBaseUrl: String,
    accessToken: String,
    issuerDid: String,
    credentialType: String
  ) {
    val endpoint = buildString {
      append(vcRegistryBaseUrl.trimEnd('/'))
      append("/issuers/")
      append(issuerDid)
      append("/bsl/issueCredential")
    }
    val body = buildJsonObject { put("vc_type", credentialType) }

    val response = http.post(endpoint) {
      headers {
        appendAll(Headers.build { set(HttpHeaders.Authorization, "Bearer ${'$'}accessToken") })
      }
      contentType(ContentType.Application.Json)
      setBody(body.toString())
    }
    val text = response.bodyAsText()
    if (!response.status.isSuccess()) {
      throw IllegalArgumentException("Issue bsl credential api failed: ${'$'}{response.status} body=${'$'}text")
    }
  }

  private suspend fun assignBslIndex(
    vcRegistryBaseUrl: String,
    accessToken: String,
    issuerDid: String,
    credentialType: String,
    credentialId: String
  ): JsonArray {
    val endpoint = buildString {
      append(vcRegistryBaseUrl.trimEnd('/'))
      append("/issuers/")
      append(issuerDid)
      append("/bsl/assignIndex")
    }

    val body = buildJsonObject {
      put("vc_type", credentialType)
      put("vc_id", credentialId)
    }

    val response = http.post(endpoint) {
      headers { appendAll(Headers.build { set(HttpHeaders.Authorization, "Bearer ${'$'}accessToken") }) }
      contentType(ContentType.Application.Json)
      setBody(body.toString())
    }
    val text = response.bodyAsText()
    if (!response.status.isSuccess()) {
      throw IllegalArgumentException("Assign index api failed: ${'$'}{response.status} body=${'$'}text")
    }
    return Json.parseToJsonElement(text).jsonArray
  }
}
```
