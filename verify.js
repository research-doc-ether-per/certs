
{
  policies: [
    {
      policy: 'date-within',
      path: '$.credentialSubject.issuedAt',
      years: 5,
    },
  ],
},


 policies: [
    {
      policy: 'regex',
      path: '$.credentialSubject.position',
      regex: '^sales$',
    },
    {
      policy: 'date-duration',
      fromPath: '$.credentialSubject.from',
      toPath: '$.credentialSubject.to',
      minimumYears: 3,
    },
  ],


   const buildCredentialsAndVpPolicies = (combinationData) => {
  const credentials = []
  let vp_policies = {}

  // 共通 VC policies
  const credentialPolicies = [...vc_policies]

  for (const data of combinationData) {
    credentials.push({
      id: v4(),
      format: data.format,
      meta: {
        ...(data.format === 'dc+sd-jwt'
          ? { vct_values: [data.vct] }
          : { type_values: [[data.type]] }),
      },
    })

    // Credential 固有 policy を追加
    if (data.policies) {
      credentialPolicies.push(...data.policies)
    }

    // format ごとの VP policies
    vp_policies = {
      ...vp_policies,
      ...(data.format === 'dc+sd-jwt'
        ? { 'dc+sd-jwt': sd_jwt_vp_policies }
        : { [data.format]: jwt_vp_policies }),
    }
  }

  return {
    credentials,
    vc_policies: credentialPolicies,
    vp_policies,
  }
}
