
val vcJson = vc.content 

val credentialId: String =
  vcJson["id"]?.jsonPrimitive?.content ?: error("vc.id missing")

val issuerDid: String =
  when (val iss = vcJson["issuer"]) {
    is JsonPrimitive -> iss.content
    is JsonObject    -> iss["id"]?.jsonPrimitive?.content
    else             -> null
  } ?: error("vc.issuer missing")

val credentialType: String =
  vcJson["type"]?.let { t ->
    when (t) {
      is JsonArray    -> t.mapNotNull { it.jsonPrimitive.contentOrNull }
                         .firstOrNull { it != "VerifiableCredential" }
      is JsonPrimitive -> t.content
      else             -> null
    }
  } ?: error("vc.type missing or invalid")

val statusArr: JsonArray =
  CredentialStatusProvider.build(
    issuerDid = issuerDid,
    credentialType = credentialType,
    credentialId = credentialId
  ) ?: error("CredentialStatusProvider returned null for vc.id=$credentialId")


val patchedContent = buildJsonObject {
  vcJson.forEach { (k, v) -> put(k, v) } 
  put("credentialStatus", statusArr)
}
vc = vc.copy(content = patchedContent) 
