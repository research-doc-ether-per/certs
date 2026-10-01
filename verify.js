const presentationData = require('../input-datas/presentation-data.json')

const {
  jwt_vp_policies,
  sd_jwt_vp_policies,
  global_vc_policies,
  credentials: credentialConfigs,
  specific_vc_policies,
} = presentationData


const individualTargets = [
  {
    type: 'Awards',
    format: 'jwt_vc_json',
    result: true,
  },
  {
    type: 'Awards',
    format: 'dc+sd-jwt',
    result: false,
  },
  {
    type: 'Career',
    format: 'jwt_vc_json',
    result: true,
  },
  {
    type: 'Career',
    format: 'dc+sd-jwt',
    result: false,
  },
  {
    type: 'Qualification',
    format: 'jwt_vc_json',
    result: true,
  },
]

const combinationTargets = [
  // Qualifications AND (Career OR Awards)
  {
    credentials: [
      {
        type: 'Qualification',
        format: 'jwt_vc_json',
        result: true,
      },
      {
        type: 'Career',
        format: 'dc+sd-jwt',
        result: true,
      },
      {
        type: 'Awards',
        format: 'dc+sd-jwt',
        result: true,
      },
    ],
    options: [
      [
        'Qualification_JWT_VERIFICATION_TRUE',
        'Career_SD_JWT_VERIFICATION_TRUE',
      ],
      [
        'Qualification_JWT_VERIFICATION_TRUE',
        'Awards_SD_JWT_VERIFICATION_TRUE',
      ],
    ],
  },

  // Career AND Awards
  {
    credentials: [
      {
        type: 'Career',
        format: 'dc+sd-jwt',
        result: false,
      },
      {
        type: 'Awards',
        format: 'dc+sd-jwt',
        result: true,
      },
    ],
    options: [
      [
        'Career_SD_JWT_VERIFICATION_FALSE',
        'Awards_SD_JWT_VERIFICATION_TRUE',
      ],
    ],
  },
]

const runCombinedVerification = async (holderInfo) => {
  logger.debug('*** runCombinedVerification start ***')

  try {
    const results = []

    for (
      let index = 0;
      index < combinationTargets.length;
      index++
    ) {
      const target = combinationTargets[index]

      const {
        credentials,
        vc_policies: credentialPolicies,
        specific_vc_policies: specificVcPolicies,
        vp_policies,
      } = buildCredentialsAndVpPolicies(
        target.credentials,
        'combined'
      )

      const credentialSets =
        buildCredentialSets(target.options)

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

      const result =
        await verifyCredential(createSessionParams)

      results.push(result)
    }

    return results
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** runCombinedVerification end ***')
  }
}


/**
 * Credential 設定のキーを生成する
 */
const getCredentialConfigKey = (type, format) => {
  return `${type}_${format}`
}

/**
 * Credential 設定を取得する
 */
const getCredentialConfig = (type, format, result) => {
  logger.debug('*** getCredentialConfig start ***')

  try {
    const configKey = getCredentialConfigKey(type, format)
    const resultKey = String(result)

    logger.debug('configKey : ', configKey)
    logger.debug('resultKey : ', resultKey)

    const credentialConfig =
      credentialConfigs?.[configKey]?.[resultKey]

    if (!credentialConfig) {
      throw new Error(
        `Credential 設定が存在しません。configKey=${configKey}, result=${resultKey}`
      )
    }

    logger.debug(
      'credentialConfig : ',
      JSON.stringify(credentialConfig, null, 2)
    )

    return credentialConfig
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getCredentialConfig end ***')
  }
}

/**
 * Credential ごとの specific VC policy を取得する
 */
const getSpecificVcPolicies = (type, format) => {
  logger.debug('*** getSpecificVcPolicies start ***')

  try {
    const configKey = getCredentialConfigKey(type, format)

    const result =
      specific_vc_policies?.[configKey] || []

    logger.debug(
      'specificVcPolicies : ',
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getSpecificVcPolicies end ***')
  }
}

/**
 * format に応じた VP policy を取得する
 */
const getVpPolicies = (format) => {
  logger.debug('*** getVpPolicies start ***')

  try {
    let policies = []

    if (format === 'dc+sd-jwt') {
      policies = sd_jwt_vp_policies
    } else if (format === 'jwt_vc_json') {
      policies = jwt_vp_policies
    }

    const result = {
      [format]: policies,
    }

    logger.debug(
      'vpPolicies : ',
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getVpPolicies end ***')
  }
}


/**
 * DCQL credentials / VC policies / VP policies を生成する
 */
const buildCredentialsAndVpPolicies = (targetDataList, status) => {
  logger.debug('*** buildCredentialsAndVpPolicies start ***')

  try {
    logger.debug(
      'targetDataList : ',
      JSON.stringify(targetDataList, null, 2)
    )

    const credentials = []
    const credentialPolicies = [...global_vc_policies]

    let specificVcPolicies = {}
    let vpPolicies = {}

    for (const targetData of targetDataList) {
      const {
        type,
        format,
        result,
      } = targetData

      // -------------------------------------------------
      // DCQL Credential を取得
      // -------------------------------------------------
      const credentialConfig = getCredentialConfig(
        type,
        format,
        result
      )

      credentials.push(credentialConfig)

      // -------------------------------------------------
      // Specific VC Policy を取得
      // -------------------------------------------------
      const policies = getSpecificVcPolicies(
        type,
        format
      )

      if (status === 'individual') {
        credentialPolicies.push(...policies)
      }

      if (status === 'combined') {
        specificVcPolicies = {
          ...specificVcPolicies,

          // DCQL Credential の id をキーとして設定する
          [credentialConfig.id]: policies,
        }
      }

      // -------------------------------------------------
      // VP Policy を取得
      // -------------------------------------------------
      const formatVpPolicies = getVpPolicies(format)

      vpPolicies = {
        ...vpPolicies,
        ...formatVpPolicies,
      }
    }

    const result = {
      credentials,
      vc_policies: credentialPolicies,
      vp_policies: vpPolicies,

      ...(status === 'combined'
        ? {
            specific_vc_policies: specificVcPolicies,
          }
        : {}),
    }

    logger.debug(
      'result : ',
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** buildCredentialsAndVpPolicies end ***')
  }
}



const runIndividualVerification = async () => {
  logger.debug('*** runIndividualVerification start ***')

  try {
    const results = []

    for (
      let index = 0;
      index < individualTargets.length;
      index++
    ) {
      const targetData = individualTargets[index]

      const combinationData = [targetData]

      const {
        credentials,
        vc_policies: credentialPolicies,
        vp_policies,
      } = buildCredentialsAndVpPolicies(
        combinationData,
        'individual'
      )

      const createSessionParams = {
        flow_type: 'cross_device',
        core_flow: {
          dcql_query: {
            credentials,
          },
          policies: {
            vc_policies: credentialPolicies,
            vp_policies,
          },
        },
      }

      logger.debug(
        'createSessionParams: ',
        JSON.stringify(createSessionParams, null, 2)
      )

      const result =
        await verifyCredential(createSessionParams)

      results.push(result)
    }

    return results
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** runIndividualVerification end ***')
  }
}

