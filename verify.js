/**
 * Credential Offer用の共通Payloadを準備する
 *
 * @param {Object} params パラメーター
 * @returns {Object} 共通Payload
 */
const prepareCredentialOfferPayload = ({
  issuerKey,
  issuerDid,
  credentialConfigurationId,
  credentialData,
  credentialInformation,
  selectiveDisclosure,
  authenticationMethod,
  category,
  certName,
  format,
  docId,
  issuanceDate,
  expirationDate,
  ctxByFormat,
  categories,
  images,
}) => {
  const { type } = credentialData

  const payload = {
    issuerKey,
    issuerDid,
    credentialConfigurationId,

    credentialData: {
      '@context': ctxByFormat[format],

      type: [
        'VerifiableCredential',
        type,
      ],

      credentialSubject: {
        credentialInformation: {
          ...credentialInformation,
          docId,

          ...(categories[category]
            ? {
                type: categories[category],
              }
            : {}),

          certName,

          image:
            images[category] ||
            images.default,

          issuanceDate,
          expirationDate,
        },
      },
    },

    standardVersion: 'DRAFT13',
    authenticationMethod,
    selectiveDisclosure,
  }

  // 有効期限が指定されていない場合は、
  // expirationDateプロパティ自体を削除する
  if (!expirationDate) {
    delete payload
      .credentialData
      .credentialSubject
      .credentialInformation
      .expirationDate
  }

  return payload
}

const payload =
  prepareCredentialOfferPayload({
    issuerKey,
    issuerDid,
    credentialConfigurationId,
    credentialData,
    credentialInformation,
    selectiveDisclosure,
    authenticationMethod,
    category,
    certName,
    format,
    docId,
    issuanceDate,
    expirationDate,
    ctxByFormat,
    categories,
    images,
  })
