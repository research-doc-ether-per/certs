@OptIn(ExperimentalSerializationApi::class)
private fun getMdocCredentialDataResult(
    processedOffer: ProcessedCredentialOffer,
    credential: String,
): CredentialDataResult {

    logger.info { "===== MDoc Credential Debug =====" }

    logger.info { "processedOffer: $processedOffer" }

    logger.info { "credentialResponse.format: ${processedOffer.credentialResponse.format}" }

    logger.info { "credentialResponse.credential: ${processedOffer.credentialResponse.credential}" }

    logger.info { "credentialRequest: ${processedOffer.credentialRequest}" }

    logger.info { "credentialRequest.docType: ${processedOffer.credentialRequest?.docType}" }

    logger.info { "customParameters: ${processedOffer.credentialResponse.customParameters}" }

    val credentialEncoding =
        processedOffer.credentialResponse.customParameters!!["credential_encoding"]
            ?.jsonPrimitive
            ?.content ?: "issuer-signed"

    logger.info { "Parsed credentialEncoding: $credentialEncoding" }

    val docType =
        processedOffer.credentialRequest?.docType
            ?: throw IllegalArgumentException("Credential request has no docType property")

    logger.info { "Parsed docType: $docType" }

    logger.info { "Credential (base64 length): ${credential.length}" }

    val decodedCredential = credential.base64UrlDecode()

    logger.info { "Decoded credential bytes size: ${decodedCredential.size}" }

    val cborData = Cbor.decodeFromByteArray(decodedCredential)

    logger.info { "CBOR decoded data: $cborData" }

    val issuerSigned = IssuerSigned.fromMapElement(cborData)

    logger.info { "IssuerSigned: $issuerSigned" }

    val mDoc = when (credentialEncoding) {
        "issuer-signed" -> MDoc(
            docType.toDataElement(),
            issuerSigned,
            null
        )
        else -> throw IllegalArgumentException("Invalid credential encoding: $credentialEncoding")
    }

    logger.info { "Generated mDoc: $mDoc" }

    val result = CredentialDataResult(
        id = randomUUIDString(),
        document = mDoc.toCBORHex(),
        type = docType,
        format = CredentialFormat.mso_mdoc,
    )

    logger.info { "CredentialDataResult: $result" }

    logger.info { "===== End MDoc Credential Debug =====" }

    return result
}
