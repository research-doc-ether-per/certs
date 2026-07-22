if (baseInfo) {
  baseInfo.credentialOfferEndpointName =
    await getCredentialOfferEndpointName({
      walletDBPool: walletDBService.walletDBPool,
      groupId,
      credentialOfferEndpoint: baseInfo.credentialOfferEndpoint,
    })
}
