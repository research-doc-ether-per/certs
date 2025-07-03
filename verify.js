// KeyBindingJwt.kt
fun verifyKB(
    jwtCryptoProvider: JWTCryptoProvider,
    reqAudience: String,
    reqNonce: String,
    sdJwt: SDJwt,
    keyId: String? = null
): Boolean {

    val pretty = Json { prettyPrint = true }

    println("▶︎ verifyKB() called")
    println("  reqAudience = $reqAudience")
    println("  reqNonce    = $reqNonce")
    println("  header.kid  = ${header["kid"]}")
    println("  payload.aud = $audience")
    println("  payload.nonce = $nonce")
    println("  payload.sd_hash = $sdHash")

    val expectedHash = getSdHash(
        sdJwt.toString(formatForPresentation = true, withKBJwt = false)
    )
    println("  expected sd_hash = $expectedHash")

    println("  --- full header ---")
    println(pretty.encodeToString(JsonObject.serializer(), header))
    println("  --- full payload ---")
    println(pretty.encodeToString(JsonObject.serializer(), payload))
    println("▲ verifyKB() debug end\n")

    return type == KB_JWT_TYPE &&
           audience == reqAudience &&
           nonce == reqNonce &&
           sdJwt.isPresentation &&
           expectedHash == sdHash &&
           verify(jwtCryptoProvider, keyId).verified
}
