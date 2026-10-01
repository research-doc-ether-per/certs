// 証明書の組み合わせ
const combinationTargets = [
  // ① Qualifications AND (Career OR Awards)
  {
    credentials: [
      'Qualifications_jwt_vc_json',
      'Career_dc+sd-jwt',
      'Awards_dc+sd-jwt',
    ],
    options: [
      [
        'Qualifications_jwt_vc_json',
        'Career_dc+sd-jwt',
      ],
      [
        'Qualifications_jwt_vc_json',
        'Awards_dc+sd-jwt',
      ],
    ],
  },

  // ② Qualifications OR Career OR Awards
  {
    credentials: [
      'Qualifications_jwt_vc_json',
      'Career_jwt_vc_json',
      'Awards_jwt_vc_json',
    ],
    options: [
      ['Qualifications_jwt_vc_json'],
      ['Career_jwt_vc_json'],
      ['Awards_jwt_vc_json'],
    ],
  },

  // ③ Career AND Awards
  {
    credentials: [
      'Career_dc+sd-jwt',
      'Awards_dc+sd-jwt',
    ],
    options: [
      [
        'Career_dc+sd-jwt',
        'Awards_dc+sd-jwt',
      ],
    ],
  },
]




/**
 * DCQL credential_sets を生成
 */
const buildCredentialSets = (options) => {
  return [
    {
      required: true,
      options,
    },
  ]
}

const extractedCombinationData = combinationTargets.map((target) => ({
  options: target.options,

  credentials: target.credentials
    .map((id) => {
      const item = presentationMap.find(
        (v) => `${v.type}_${v.format}` === id
      )

      return item
    })
    .filter(Boolean),
}))


 const {
    credentials: combinationData,
    options,
  } = extractedCombinationData[index]



 // credential_sets を生成
  const credentialSets = buildCredentialSets(options)


 credential_sets: credentialSets,

   
