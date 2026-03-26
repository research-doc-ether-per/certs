
fun verify(
    verificationParams: MDocVerificationParams,
    cryptoProvider: COSECryptoProvider
): Boolean {

    return VerificationType.all.all { type ->

        println("========== START VERIFY: type = $type ==========")

        val result: Boolean =
            !verificationParams.verificationTypes.has(type) || when (type) {

                VerificationType.VALIDITY -> {
                    val r = verifyValidity()
                    println("[VERIFY][$type] VALIDITY = $r")
                    r
                }

                VerificationType.DOC_TYPE -> {
                    val r = verifyDocType()
                    println("[VERIFY][$type] DOC_TYPE = $r")
                    r
                }

                VerificationType.CERTIFICATE_CHAIN -> {
                    val r = verifyCertificate(cryptoProvider, verificationParams.issuerKeyID)
                    println("[VERIFY][$type] CERTIFICATE_CHAIN = $r")
                    r
                }

                VerificationType.ITEMS_TAMPER_CHECK -> {
                    val r = verifyIssuerSignedItems()
                    println("[VERIFY][$type] ITEMS_TAMPER_CHECK = $r")
                    r
                }

                VerificationType.ISSUER_SIGNATURE -> {
                    val r = verifySignature(cryptoProvider, verificationParams.issuerKeyID)
                    println("[VERIFY][$type] ISSUER_SIGNATURE = $r")
                    r
                }

                VerificationType.DEVICE_SIGNATURE -> {
                    val r = verifyDeviceSigOrMac(verificationParams, cryptoProvider)
                    println("[VERIFY][$type] DEVICE_SIGNATURE = $r")
                    r
                }
            }

        println("========== END VERIFY: type = $type, result = $result ==========\n")

        result
    }
}
