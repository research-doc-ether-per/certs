
println("========== SD-JWT Signing Debug START ==========")

// 1. issuerId / issuerDid
println("[1] issuerId = $issuerId")

val issuerDid = if (DidUtils.isDidUrl(issuerId)) issuerId else null

println("[2] DidUtils.isDidUrl(issuerId) = ${DidUtils.isDidUrl(issuerId)}")
println("[3] issuerDid = $issuerDid")


// 2. issuerKid
println("[4] issuerSigningKey type = ${issuerSigningKey::class.simpleName}")

val issuerKid = try {
    val kid = when (issuerSigningKey) {
        is IssuerSigningKey.Legacy ->
            getKidHeader(issuerSigningKey.key, issuerDid)

        is IssuerSigningKey.Crypto2 ->
            getKidHeader(issuerSigningKey.key, issuerDid)
    }

    println("[5] issuerKid = $kid")
    kid
} catch (e: Exception) {
    println("[ERROR-5] getKidHeader failed")
    println("[ERROR-5] ${e::class.simpleName}: ${e.message}")
    e.printStackTrace()
    throw e
}


// 3. headers
val headers = mapOf(
    JWT_HEADER_KID to JsonPrimitive(issuerKid),
    JWT_HEADER_TYPE to JsonPrimitive(sdJwtTypeHeader ?: SD_JWT_VC_TYPE_HEADER),
).plus(
    x5Chain?.let {
        mapOf(
            JWT_HEADER_X5C to JsonArray(
                it.map { cert ->
                    JsonPrimitive(cert.encodedDer.toByteArray().encodeToBase64())
                }
            )
        )
    } ?: mapOf()
)

println("[6] headers = $headers")


// 4. finalSdPayload
println("[7] Creating finalSdPayload")

val finalSdPayload = SDPayload.createSDPayload(
    fullPayload = fullPayload,
    undisclosedPayload = undisclosedPayload
)

println("[8] finalSdPayload created")
println("[9] undisclosedPayload = ${finalSdPayload.undisclosedPayload}")


// 5. signable
val signable =
    finalSdPayload.undisclosedPayload.toString().encodeToByteArray()

println("[10] signable created")
println("[11] signable size = ${signable.size}")


// 6. signing
println("[12] Signing START")

val jwt = try {
    when (issuerSigningKey) {
        is IssuerSigningKey.Legacy -> {
            println("[13] Signing with Legacy key")

            issuerSigningKey.key.signJws(
                signable,
                headers
            )
        }

        is IssuerSigningKey.Crypto2 -> {
            println("[13] Signing with Crypto2 key")
            println("[14] algorithm = ${issuerSigningKey.algorithm}")

            CompactJws.sign(
                payload = signable,
                key = issuerSigningKey.key,
                algorithm = issuerSigningKey.algorithm,
                protectedHeader = JsonObject(headers),
            )
        }
    }
} catch (e: Exception) {
    println("[ERROR-SIGN] SD-JWT signing failed")
    println("[ERROR-SIGN] ${e::class.simpleName}: ${e.message}")
    e.printStackTrace()
    throw e
}

println("[15] Signing SUCCESS")
println("[16] jwt length = ${jwt.length}")


// 7. SDJwt creation
println("[17] SDJwt.createFromSignedJwt START")

val sdJwtVC = try {
    SDJwtVC(
        sdJwt = SDJwt.createFromSignedJwt(
            signedJwt = jwt,
            sdPayload = finalSdPayload
        )
    )
} catch (e: Exception) {
    println("[ERROR-SDJWT] SDJwt.createFromSignedJwt failed")
    println("[ERROR-SDJWT] ${e::class.simpleName}: ${e.message}")
    e.printStackTrace()
    throw e
}

println("[18] SDJwt.createFromSignedJwt SUCCESS")


// 8. result
val result = sdJwtVC.toString().plus(SEPARATOR_STR)

println("[19] SD-JWT result created")
println("[20] result length = ${result.length}")
println("========== SD-JWT Signing Debug END ==========")

return result
