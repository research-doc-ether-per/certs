val result = CredentialResult(
    format = CredentialFormat.mso_mdoc,
    credential = JsonPrimitive(
        mdoc.issuerSigned
            .toMapElement()
            .toCBOR()
            .encodeToBase64Url()
    ),
    customParameters = mapOf(
        "credential_encoding" to JsonPrimitive("issuer-signed")
    )
)

logger.info { "Generated CredentialResult: $result" }

return result
