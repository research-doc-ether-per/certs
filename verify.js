import id.walt.w3c.status.CredentialStatusProvider




try {
    val statusArr = CredentialStatusProvider.build(issuerDid!!, vcType!!, credId!!)

    if (statusArr == null) {
        log.warn { "CredentialStatusProvider.build() returned null for $credId" }
    } else {
        vc.customFields["credentialStatus"] = statusArr
        log.info { "credentialStatus assigned for $credId" }
    }

} catch (e: Exception) {
    log.error(e) { "Failed to build credentialStatus for $credId" }
}
