const DOC_TYPE = 'org.iso.18013.5.1.mDL'
const ISO_NAMESPACE = 'org.iso.18013.5.1'

const presentationDefinition = {
  id: 'pd-mdl',
  input_descriptors: [
    {
      id: DOC_TYPE,
      format: {
        mso_mdoc: {
          alg: ['ES256'],
        },
      },
      constraints: {
        fields: [
          {
            path: [
              "$['docType']",
            ],
            filter: {
              const: DOC_TYPE,
            },
            intent_to_retain: false,
          },
          {
            path: [
              `$['issuerSigned']['nameSpaces']['${ISO_NAMESPACE}'][?(@.elementIdentifier == 'age_over_18')].elementValue`,
            ],
            intent_to_retain: false,
          },
          {
            path: [
              `$['issuerSigned']['nameSpaces']['${ISO_NAMESPACE}'][?(@.elementIdentifier == 'issue_date')].elementValue`,
            ],
            intent_to_retain: false,
          },
          {
            path: [
              `$['issuerSigned']['nameSpaces']['${ISO_NAMESPACE}'][?(@.elementIdentifier == 'expiry_date')].elementValue`,
            ],
            intent_to_retain: false,
          },
        ],
        limit_disclosure: 'required',
      },
    },
  ],
}
