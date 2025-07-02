//SDJWTUtils.kt
package id.walt.sdjwt

import id.walt.sdjwt.utils.Base64Utils.base64UrlDecode
import kotlinx.serialization.json.*

actual fun getHolderKeyJWKFromKbJwtImpl(kbJwt: String): JsonObject? {
    return try {
        val firstDot  = kbJwt.indexOf(".", 0)
        println("firstDot = $firstDot")

        val secondDot = kbJwt.indexOf(".", firstDot + 1)
        println("secondDot = $secondDot")

        check(firstDot >= 0 && secondDot > firstDot) { "Invalid KB-JWT format" }

        val payload = kbJwt.substring(firstDot + 1, secondDot)
        println("payload = $payload")

        val payloadJsonStr = payload.base64UrlDecode().decodeToString()
        println("payloadJsonStr = $payloadJsonStr")

        val payloadJson = Json.parseToJsonElement(payloadJsonStr).jsonObject
        println("payloadJson = $payloadJson")

        payloadJson["cnf"]?.jsonObject?.get("jwk")?.jsonObject
    } catch (e: Exception) {
        println("getHolderKeyJWKFromKbJwtImpl error: ${e.message}")
        null
    }
}

//SDJWTUtils.kt
package id.walt.sdjwt

import kotlinx.serialization.json.JsonObject

expect fun getHolderKeyJWKFromKbJwtImpl(kbJwt: String): JsonObject?

//SDJWTUtils.kt
package id.walt.sdjwt

import kotlinx.serialization.json.JsonObject

actual fun getHolderKeyJWKFromKbJwtImpl(kbJwt: String): JsonObject? {
    throw NotImplementedError("getHolderKeyJWKFromKbJwtImpl is not implemented for JS platform.")
}

  @JvmBlocking
  @JvmAsync
  @JsPromise
  @JsExport.Ignore
  override suspend fun verify(credential: String, args: Any?, context: Map<String, Any>): Result<Any> {
    val sdJwtVC = SDJwtVC.parse(credential)
    val issuerKey = resolveIssuerKeyFromSdJwt(sdJwtVC)
    if(!sdJwtVC.isPresentation)
      return issuerKey.verifyJws(credential)
    else {
      val holderKeyJson = sdJwtVC.getEffectiveHolderKeyJWK()
          ?: throw UnsupportedOperationException("Unable to resolve holder key: neither holderKeyJWK nor kb_jwt.cnf.jwk is present")

      val holderKey = JWKKey.importJWK(holderKeyJson.toString()).getOrThrow()
      return sdJwtVC.verifyVC(
        JWTCryptoProviderManager.getDefaultJWTCryptoProvider(mapOf(
          (sdJwtVC.keyID ?: issuerKey.getKeyId()) to issuerKey,
          holderKey.getKeyId() to holderKey)
        ),
        requiresHolderKeyBinding = true,
        context["clientId"]?.toString(),
        context["challenge"]?.toString()
      ).let {
        if(it.verified)
          Result.success(sdJwtVC.undisclosedPayload)
        else
          Result.failure(VerificationException("SD-JWT verification failed"))
      }
    }
  }

  fun getEffectiveHolderKeyJWK(): JsonObject? {
    return holderKeyJWK ?: keyBindingJwt?.jwt?.let { getHolderKeyJWKFromKbJwtImpl(it) }
  }


  
