override suspend fun verify(
  credential: String,
  args: Any?,
  context: Map<String, Any>
): Result<Any> {
  val sdJwtVC = SDJwtVC.parse(credential)
  println("[sd-jwt] isPresentation=${sdJwtVC.isPresentation}, kid=${sdJwtVC.keyID}")

  val issuerKey = resolveIssuerKeyFromSdJwt(sdJwtVC)
  println("[sd-jwt] issuerKeyId=${sdJwtVC.keyID ?: issuerKey.getKeyId()}")

  if (!sdJwtVC.isPresentation) {
    val r = issuerKey.verifyJws(credential)
    println("[sd-jwt] verifyJws -> $r")
    return r
  } else {
    val holderKey = JWKKey.importJWK(sdJwtVC.holderKeyJWK.toString()).getOrThrow()

    val provider = JWTCryptoProviderManager.getDefaultJWTCryptoProvider(
      mapOf(
        (sdJwtVC.keyID ?: issuerKey.getKeyId()) to issuerKey,
        holderKey.getKeyId() to holderKey
      )
    )

    val res = sdJwtVC.verifyVC(
      provider,
      requiresHolderKeyBinding = true,
      clientId = context["clientId"]?.toString(),
      nonce = context["challenge"]?.toString()
    )

    println("[sd-jwt] verifyVC result = $res")

    return if (res.verified) {
      Result.success(sdJwtVC.undisclosedPayload)
    } else {
      Result.failure(VerificationException("SD-JWT verification failed: $res"))
    }
  }
}

