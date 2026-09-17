logger.debug(
  '発行された Credential の詳細を確認します。'
)

const credentialDetails = []

for (const credentialId of credentialIds) {
  const credential =
    await wallet2Service.getCredential(
      walletId,
      credentialId
    )

  logger.debug(
    `Credential 詳細: ${credentialId}`
  )
  logger.debug(
    JSON.stringify(credential, null, 2)
  )

  credentialDetails.push(credential)
}
