
// 証明書の組み合わせ
const combinationTargets = [
  // ① AND:
  // Qualifications + Career + Awards のすべてが必要
  {
    operator: 'AND',
    credentials: [
      'Qualifications_jwt_vc_json',
      'Career_dc+sd-jwt',
      'Awards_dc+sd-jwt',
    ],
  },

  // ② OR:
  // Qualifications / Career / Awards のいずれか1つが必要
  {
    operator: 'OR',
    credentials: [
      'Qualifications_jwt_vc_json',
      'Career_jwt_vc_json',
      'Awards_jwt_vc_json',
    ],
  },

  // ③ AND:
  // Career + Awards の両方が必要
  {
    operator: 'AND',
    credentials: [
      'Career_dc+sd-jwt',
      'Awards_dc+sd-jwt',
    ],
  },
]


const buildCredentialsAndVpPolicies = (
  combinationData,
  status,
  operator = 'AND'
) => {
  // DCQL credentials を初期化
  const credentials = []

  // VP policies を初期化
  let vp_policies = {}

  // Global VC policies
  const credentialPolicies = [...vc_policies]

  // Credential ごとの VC policies
  let specificVcPolicies = {}

  // credential_sets で使用する credential ID
  const credentialConfigIds = []

  // 各 credential 情報を順番に処理する
  for (const data of combinationData) {
    // DCQL credential query ID
    const credentialConfigId = `${data.type}_${data.format}`

    credentialConfigIds.push(credentialConfigId)

    // credentials に追加
    credentials.push({
      id: credentialConfigId,
      format: data.format,
      meta: {
        // format に応じて meta を切り替える
        // dc+sd-jwt の場合は vct_values を設定
        // それ以外の場合は type_values を設定
        ...(data.format === 'dc+sd-jwt'
          ? {
              vct_values: [data.vct],
            }
          : {
              type_values: [data.type],
            }),
      },
    })

    /**
     * individual:
     * 単一 Credential の検証では、
     * Credential 固有の policy を vc_policies に追加する
     */
    if (data.policies && status === 'individual') {
      credentialPolicies.push(...data.policies)
    }

    /**
     * combined:
     * 複数 Credential の検証では、
     * Credential 固有の policy を
     * specific_vc_policies に設定する
     */
    if (data.policies && status === 'combined') {
      specificVcPolicies = {
        ...specificVcPolicies,
        [credentialConfigId]: data.policies,
      }
    }

    /**
     * format ごとの VP policy を設定する
     */
    vp_policies = {
      ...vp_policies,
      ...(data.format === 'dc+sd-jwt'
        ? {
            [data.format]: sd_jwt_vp_policies,
          }
        : {
            [data.format]: jwt_vp_policies,
          }),
    }
  }

  /**
   * credential_sets を生成する
   *
   * AND:
   * options: [
   *   [credentialA, credentialB, credentialC]
   * ]
   *
   * OR:
   * options: [
   *   [credentialA],
   *   [credentialB],
   *   [credentialC]
   * ]
   */
  const credentialSets = [
    {
      required: true,
      options:
        operator === 'OR'
          ? credentialConfigIds.map((id) => [id])
          : [credentialConfigIds],
    },
  ]

  // 生成結果を返却
  return {
    credentials,
    credential_sets: credentialSets,
    vc_policies: credentialPolicies,
    vp_policies,

    ...(status === 'combined'
      ? {
          specific_vc_policies: specificVcPolicies,
        }
      : {}),
  }
}


try {
  /**
   * 設定ファイルから指定した組み合わせを抽出
   *
   * combinationTargets:
   * {
   *   operator: 'AND' | 'OR',
   *   credentials: [...]
   * }
   *
   * ↓
   *
   * extractedCombinationData:
   * {
   *   operator: 'AND' | 'OR',
   *   credentials: [presentationMap のデータ]
   * }
   */
  const extractedCombinationData = combinationTargets.map((target) => ({
    operator: target.operator,

    credentials: target.credentials
      .map((id) => {
        const item = presentationMap.find(
          (v) => `${v.type}_${v.format}` === id
        )

        return item
      })
      .filter(Boolean),
  }))

  const results = []

  for (
    let index = 0;
    index < extractedCombinationData.length;
    index++
  ) {
    const {
      operator,
      credentials: combinationData,
    } = extractedCombinationData[index]

    /**
     * credentials / credential_sets / policies を生成
     */
    const {
      credentials,
      credential_sets: credentialSets,
      vc_policies: credentialPolicies,
      specific_vc_policies: specificVcPolicies,
      vp_policies,
    } = buildCredentialsAndVpPolicies(
      combinationData,
      'combined',
      operator
    )

    /**
     * 検証セッションを作成
     */
    const createSessionParams = {
      flow_type: 'cross_device',

      core_flow: {
        dcql_query: {
          credentials,
          credential_sets: credentialSets,
        },

        policies: {
          vc_policies: credentialPolicies,
          specific_vc_policies: specificVcPolicies,
          vp_policies,
        },
      },
    }

    logger.debug(
      'createSessionParams: ',
      JSON.stringify(createSessionParams, null, 2)
    )

    const result = await verifyCredential(createSessionParams)

    results.push(result)
  }

  return results
} catch (error) {
  logger.error(error)
  throw error
}
