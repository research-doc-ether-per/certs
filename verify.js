
val credentialType = vct.substringAfterLast("/")

val dynamicCredentialStatus = CredentialStatusProviderRegistry.provide(
    credential = mappedCredentialData,
    issuerId = issuerId,
    credentialType = credentialType,
)
