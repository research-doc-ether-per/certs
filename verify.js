
import kotlinx.serialization.json.*

val credentialId: String =
    vc["id"]?.jsonPrimitive?.content
        ?: error("vc.id missing")

val issuerDid: String =
    vc["issuer"]?.jsonPrimitive?.content
        ?: error("vc.issuer missing")

val credentialType: String =
    vc["type"]?.let { t ->
        when (t) {
            is JsonArray -> t.lastOrNull()?.jsonPrimitive?.content
            is JsonPrimitive -> t.content
            else -> null
        }
    } ?: error("vc.type missing or invalid")
