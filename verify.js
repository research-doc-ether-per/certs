val mdocNonce = if (tokenResponse.jwsParts == null && session.authorizationRequest?.responseMode == "direct_post") {
    session.authorizationRequest?.nonce
} else {
    tokenResponse.jwsParts?.header?.get("apu")?.jsonPrimitive?.content
        ?.let { Base64.getUrlDecoder().decode(it).decodeToString() }
}

if (mdocNonce == null) {
    throw IllegalStateException("No valid nonce found for mdoc verification")
}

val mdocHandoverRestored = OpenID4VP.generateMDocOID4VPHandover(
    authorizationRequest = session.authorizationRequest!!,
    mdocNonce = mdocNonce
)
