import java.util.Base64
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import io.ktor.server.auth.OAuthAccessTokenResponse
import io.ktor.server.auth.principal


val accessToken = currentPrincipal?.accessToken

val preferredUsername = accessToken?.let { token ->
    try {
        val payloadBase64 = token.split(".")[1]
        val payloadJsonString = String(java.util.Base64.getUrlDecoder().decode(payloadBase64))
        
        val payloadJson = Json.parseToJsonElement(payloadJsonString).jsonObject
        payloadJson["preferred_username"]?.jsonPrimitive?.content
    } catch (e: Exception) {
        logger.error(e) { "Failed to get preferred_username." }
        null
    }
}

logger.info { "Preferred Username: $preferredUsername" }
