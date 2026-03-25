
val authorizationRequest = session.authorizationRequest
    ?: throw IllegalStateException("authorizationRequest is null")

val presentationDefinition = authorizationRequest.presentationDefinition
    ?: throw IllegalStateException("presentationDefinition is null")

val inputDescriptor = presentationDefinition.inputDescriptors.firstOrNull()
    ?: throw IllegalStateException("inputDescriptors is empty")

val docType = inputDescriptor.id
logger.info { "verifyMdoc docType = $docType" }

val sessionTranscript = ListElement(
    listOf(
        NullElement(),
        NullElement(),
        mdocHandoverRestored
    )
)
logger.info { "verifyMdoc sessionTranscript = $sessionTranscript" }

val deviceAuthentication = DeviceAuthentication(
    sessionTranscript = sessionTranscript,
    docType = docType,
    deviceNameSpaces = EncodedCBORElement(MapElement(mapOf()))
)
logger.info { "verifyMdoc deviceAuthentication = $deviceAuthentication" }

val issuerKeyInfo = COSECryptoProviderKeyInfo(
    keyID = "ISSUER_KEY_ID",
    algorithmID = AlgorithmID.ECDSA_256,
    publicKey = issuerKey,
    privateKey = null,
    x5Chain = emptyList(), // 如果这里报类型错，再补具体泛型
    trustedRootCAs = getAdditionalTrustedRootCAs(session)
)
logger.info { "verifyMdoc issuerKeyInfo = $issuerKeyInfo" }

val devicePublicKey = deviceKey.AsPublicKey()
logger.info { "verifyMdoc devicePublicKey = $devicePublicKey" }

val deviceKeyInfo = COSECryptoProviderKeyInfo(
    keyID = "DEVICE_KEY_ID",
    algorithmID = AlgorithmID.ECDSA_256,
    publicKey = devicePublicKey,
    privateKey = null
)
logger.info { "verifyMdoc deviceKeyInfo = $deviceKeyInfo" }

val verificationParams = MDocVerificationParams(
    verificationTypes = VerificationType.forPresentation,
    issuerKeyID = "ISSUER_KEY_ID",
    deviceKeyID = "DEVICE_KEY_ID",
    deviceAuthentication = deviceAuthentication
)
logger.info { "verifyMdoc verificationParams = $verificationParams" }

val cryptoProvider = SimpleCOSECryptoProvider(
    listOf(
        issuerKeyInfo,
        deviceKeyInfo
    )
)
logger.info { "verifyMdoc cryptoProvider created" }

val verifyResult = parsedMdoc.verify(
    verificationParams,
    cryptoProvider
)
logger.info { "verifyMdoc verifyResult = $verifyResult" }

return verifyResult
