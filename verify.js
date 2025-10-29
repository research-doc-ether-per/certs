val credentialStatusArr = buildJsonArray {
  jsonArray.forEach { element ->
    val obj = element.jsonObject
    val bslVcUrl = obj["bslVcUrl"]!!.jsonPrimitive.content
    val statusListIndex = obj["index"]!!.jsonPrimitive.content
    val statusPurpose = obj["statusPurpose"]!!.jsonPrimitive.content

    val actualCredentialUrl = URLBuilder(vcRegistryBaseUrl)
      .appendPathSegments("issuers", issuerDid, "bsl", "vcUrls", bslVcUrl)
      .buildString()

    add(
      buildJsonObject {
        put("id", JsonPrimitive("$actualCredentialUrl#$statusListIndex"))
        put("type", JsonPrimitive("BitstringStatusListEntry"))
        put("statusPurpose", JsonPrimitive(statusPurpose))
        put("statusListIndex", JsonPrimitive(statusListIndex))
        put("statusListCredential", JsonPrimitive(actualCredentialUrl))
      }
    )
  }
}

log.info { "credentialStatusObj: $credentialStatusArr" }
return credentialStatusArr
