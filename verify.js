package id.walt.webwallet.utils

import com.auth0.jwk.Jwk
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.interfaces.DecodedJWT
import id.walt.webwallet.service.OidcLoginService
import java.security.interfaces.ECPublicKey
import java.security.interfaces.RSAPublicKey
import java.util.Base64

object JwkUtils {

    // ====== Public API ======

    fun verifyToken(token: String): DecodedJWT {
        val decoded = JWT.decode(token)

        // 1) Print decoded JWT (header/payload/claims/standard fields)
        printDecodedJwt(decoded, token)

        // 2) Resolve JWK by kid and print verifier-relevant info
        val kid = decoded.keyId
        require(!kid.isNullOrBlank()) { "JWT header 'kid' is missing" }

        val jwk: Jwk = OidcLoginService.jwkProvider[kid]
        printVerifierInfo(decoded, jwk)

        // 3) Build verifier and verify signature + issuer
        val algorithm = jwk.makeAlgorithm()
        val verifier = JWT.require(algorithm)
            .withIssuer(OidcLoginService.oidcRealm)
            .build()

        // NOTE: printing verifier object itself isn't useful (usually prints memory address)
        println("JWTVerifier instance: $verifier")

        val verified = verifier.verify(decoded)

        println("✅ JWT verification successful. subject=${verified.subject}")
        return verified
    }

    // ====== JWK -> Algorithm ======

    fun Jwk.makeAlgorithm(): Algorithm = when (algorithm) {
        "RS256" -> Algorithm.RSA256(publicKey as RSAPublicKey, null)
        "RS384" -> Algorithm.RSA384(publicKey as RSAPublicKey, null)
        "RS512" -> Algorithm.RSA512(publicKey as RSAPublicKey, null)
        "ES256" -> Algorithm.ECDSA256(publicKey as ECPublicKey, null)
        "ES384" -> Algorithm.ECDSA384(publicKey as ECPublicKey, null)
        "ES512" -> Algorithm.ECDSA512(publicKey as ECPublicKey, null)
        null -> Algorithm.RSA256(publicKey as RSAPublicKey, null) // fallback (as your original)
        else -> throw IllegalArgumentException("Unsupported algorithm $algorithm")
    }

    // ====== Debug helpers ======

    private fun printDecodedJwt(decoded: DecodedJWT, rawToken: String) {
        println("===== DECODED JWT =====")
        println("RAW TOKEN: $rawToken")

        // Standard fields
        println("algorithm: ${decoded.algorithm}")
        println("type: ${decoded.type}")
        println("keyId (kid): ${decoded.keyId}")
        println("issuer (iss): ${decoded.issuer}")
        println("subject (sub): ${decoded.subject}")
        println("audience (aud): ${decoded.audience}")
        println("expiresAt (exp): ${decoded.expiresAt}")
        println("issuedAt (iat): ${decoded.issuedAt}")
        println("notBefore (nbf): ${decoded.notBefore}")
        println("jwtId (jti): ${decoded.id}")

        // Header / Payload (Base64URL decode)
        println("----- HEADER JSON -----")
        println(decodeBase64UrlToString(decoded.header))

        println("----- PAYLOAD JSON -----")
        println(decodeBase64UrlToString(decoded.payload))

        // Claims
        println("----- CLAIMS (key = value.asAny()) -----")
        decoded.claims.forEach { (key, claim) ->
            // asAny() is handy for mixed types (string/number/array/object)
            println("$key = ${claim.asAny()}")
        }

        println("========================")
    }

    private fun printVerifierInfo(decoded: DecodedJWT, jwk: Jwk) {
        println("===== VERIFIER INPUTS =====")
        println("Expected issuer: ${OidcLoginService.oidcRealm}")
        println("Token issuer: ${decoded.issuer}")

        println("Using kid: ${decoded.keyId}")

        // JWK info
        println("JWK id: ${jwk.id}")
        println("JWK type (kty): ${jwk.type}")
        println("JWK algorithm (alg): ${jwk.algorithm}")

        // Some JWK implementations may expose additional fields; these are common ones:
        try {
            println("JWK publicKey: ${jwk.publicKey}") // prints object type & key info
        } catch (_: Exception) {
            println("JWK publicKey: <unavailable>")
        }

        // What algorithm will be used
        val alg = jwk.makeAlgorithm()
        println("Resolved Algorithm class: ${alg.javaClass.name}")
        println("===========================")
    }

    /**
     * JWT header/payload are Base64URL encoded and sometimes omit padding '='.
     * This helper safely pads and decodes to string.
     */
    private fun decodeBase64UrlToString(input: String): String {
        val padded = input.padEnd(((input.length + 3) / 4) * 4, '=')
        val bytes = Base64.getUrlDecoder().decode(padded)
        return String(bytes, Charsets.UTF_8)
    }
}
