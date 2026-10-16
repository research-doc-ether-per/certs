// Offer発行用のmappingを設定
const mapping = {
  ...(config.mapping ?? profile.mapping ?? {}),

  id: credentialId,

  credentialStatus: `<webhook-json:${webhookUrl}>`,
};

// Credential Offerを作成
const offer = await createCredentialOffer(profileId, {
  ...config,
  mapping,
});



curl -v -G 'http://10.0.2.15:5105/webhook/credential-status' \
  --data-urlencode 'type=Qualifications' \
  --data-urlencode 'issuerDid=did:web:10.0.2.15%3A6102:dids:issuer01' \
  --data-urlencode 'credentialId=urn:uuid:UUID'
