/**
 * Credential 発行前の準備処理を行います。
 *
 * Credential Profile の確認、
 * Credential Offer の作成、
 * BSL の作成を行います。
 */
const prepareCredentialOffer = async (
  profileId,
  config
) => {
  // Credential Profile を確認します。
  const profile =
    await checkCredentialProfile(
      profileId
    )

  // Credential Offer を作成します。
  const offer =
    await createCredentialOffer(
      profileId,
      config
    )

  // BSL を作成します。
  await vcStatusService.createBSL(
    profile.name,
    profile.issuerDid
  )

  return {
    profile,
    offer,
  }
}
