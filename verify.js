
const buildCredentialBaseId = (credential) => {
  const format =
    credential.format === 'dc+sd-jwt'
      ? 'SD_JWT'
      : 'JWT'

  return `${credential.type}_${format}`
}

const buildCredentialId = (credential) => {
  const baseId = buildCredentialBaseId(credential)

  const result =
    credential.result
      ? 'TRUE'
      : 'FALSE'

  return `${baseId}_VERIFICATION_${result}`
}

/**
 * DCQL credential_sets を生成
 *
 * options:
 *
 * [
 *   ['Qualification_JWT', 'Career_SD_JWT'],
 *   ['Qualification_JWT', 'Awards_SD_JWT'],
 * ]
 *
 * credentials の result を参照して、
 * *_VERIFICATION_TRUE / FALSE を自動生成する。
 */
const buildCredentialSets = (
  credentials,
  options
) => {
  const credentialOptions = options.map((option) =>
    option.map((baseId) => {
      const credential = credentials.find(
        (credential) =>
          buildCredentialBaseId(credential) === baseId
      )

      if (!credential) {
        throw new Error(
          `Credential configuration not found: ${baseId}`
        )
      }

      return buildCredentialId(credential)
    })
  )

  return [
    {
      required: true,
      options: credentialOptions,
    },
  ]
}

const credentialSets =
  buildCredentialSets(
    target.credentials,
    target.options
  )
