const credentialOfferUri = new URL(credentialOfferUrl)
    .searchParams.get('credential_offer_uri')

const issuerServerUrl = new URL(credentialOfferUri).origin
