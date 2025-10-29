val preparedVc: JsonObject = run {
    val originalVc: JsonObject = mapped.vc

    val credentialId = originalVc["id"]?.jsonPrimitive?.content
        ?: error("vc.id missing")
    log.info { "VC.id            = $credentialId" }

    val issuerDid = when (val iss = originalVc["issuer"]) {
        is JsonPrimitive -> iss.content
        is JsonObject    -> iss["id"]?.jsonPrimitive?.content
        else             -> null
    } ?: error("vc.issuer missing")
    log.info { "VC.issuerDid     = $issuerDid" }

    val credentialType = originalVc["type"]?.let { t ->
        when (t) {
            is JsonArray     -> t.mapNotNull { it.jsonPrimitive.contentOrNull }
                                 .firstOrNull { it != "VerifiableCredential" }
            is JsonPrimitive -> t.content
            else             -> null
        }
    } ?: error("vc.type missing or invalid")
    log.info { "VC.credentialType= $credentialType" }
  
    log.info { "Invoke CredentialStatusProvider.build(issuerDid=$issuerDid, type=$credentialType, id=$credentialId)" }
    val statusArr: JsonArray =
        CredentialStatusProvider.build(
            issuerDid = issuerDid,
            credentialType = credentialType,
            credentialId = credentialId
        ) ?: error("CredentialStatusProvider returned null for vc.id=$credentialId")
    log.info { "credentialStatus  = $statusArr" }
   
    buildJsonObject {
        originalVc.forEach { (k, v) -> put(k, v) } 
        put("credentialStatus", statusArr)
    }
}
