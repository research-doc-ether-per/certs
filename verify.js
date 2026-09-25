
const beforeIds = new Set(
  credentialsBefore.map(credential => credential.id)
)

const addedCredentialIds = credentialsAfter
  .filter(credential => !beforeIds.has(credential.id))
  .map(credential => credential.id)

logger.debug('今回追加された Credential ID:')
logger.debug(JSON.stringify(addedCredentialIds, null, 2))
