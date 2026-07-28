/**
 * Presentation Request から検証セッション取得用情報を取得する
 *
 * @param {string} presentationRequest Presentation Request URL
 * @returns {Object} 検証セッション取得用情報
 */
const getPresentationSessionInfo = (presentationRequest) => {
  const presentationUrl = new URL(presentationRequest)
  const state = presentationUrl.searchParams.get('state')
  const clientId = presentationUrl.searchParams.get('client_id')
  const verifier = clientId ? new URL(clientId).origin : null

  return {
    state,
    clientId,
    verifier,
  }
}


const { state, verifier } = getPresentationSessionInfo(presentationRequest)


/**
 * 選択された Credential から DID を取得する
 *
 * @param {Object} params パラメータ
 * @param {string[]} params.selectedCredentials 選択された Credential ID 一覧
 * @param {string} params.walletId Wallet ID
 * @param {string} params.accessToken アクセストークン
 * @returns {Promise<string | null>} DID
 */
const getDidFromSelectedCredential = async ({
  selectedCredentials,
  walletId,
  accessToken,
}) => {
  const credentialId = selectedCredentials?.[0]

  const credentialDetails = await getWaltidCredentials({
    credentialId,
    walletId,
    accessToken,
  })

  return credentialDetails?.parsedDocument?.credentialSubject?.id || null
}


const did = await getDidFromSelectedCredential({
  selectedCredentials,
  walletId,
  accessToken,
})

/**
 * 選択された VC を使用して VP を生成し、Verifier へ提出する
 *
 * @param {Object} params パラメータ
 * @param {string} params.walletId Wallet ID
 * @param {string} params.accessToken アクセストークン
 * @param {string} params.did DID
 * @param {string} params.presentationRequest Presentation Request URL
 * @param {string[]} params.selectedCredentials 選択された Credential ID 一覧
 * @param {Object} params.disclosures Disclosures
 * @returns {Promise<void>}
 */
const submitPresentationRequest = async ({
  walletId,
  accessToken,
  did,
  presentationRequest,
  selectedCredentials,
  disclosures,
}) => {
  const postData = {
    did,
    presentationRequest,
    selectedCredentials,
    disclosures,
  }

  try {
    await usePresentationRequest({
      walletId,
      accessToken,
      postData,
    })
  } catch (error) {
    logger.debug('[ERROR]usePresentationRequest:', error)
    logger.warn('Failed to usePresentationRequest.', error.status)
  }
}

await submitPresentationRequest({
  walletId,
  accessToken,
  did,
  presentationRequest,
  selectedCredentials,
  disclosures,
})

/**
 * Presentation Session を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.state State
 * @param {string} params.verifier Verifier URL
 * @returns {Promise<Object>} Presentation Session
 */
const getPresentationSessionResult = async ({ state, verifier }) => {
  try {
    return await getPresentationSession({
      state,
      verifier,
    })
  } catch (error) {
    logger.debug('[ERROR]getPresentationSession:', error)

    if (String(error.status) === '404') {
      error.code = 'PresentationRequestUrlExpiredError'
      throw error
    }

    throw error
  }
}

const sessions = await getPresentationSessionResult({
  state,
  verifier,
})

/**
 * VP Token から Credential ID 一覧を取得する
 *
 * @param {string} vpToken VP Token
 * @returns {string[]} Credential ID 一覧
 */
const getCredentialIdsFromVpToken = (vpToken) => {
  const credentialIds = []

  if (!vpToken) {
    return credentialIds
  }

  const decodedVp = jwtDecode(vpToken)
  const verifiableCredential = decodedVp?.vp?.verifiableCredential || []

  for (const vc of verifiableCredential) {
    const decodedVc = jwtDecode(vc)
    const id = decodedVc?.vc?.id || decodedVc?.id

    if (id) {
      credentialIds.push(id)
    }
  }

  if (verifiableCredential.length === 0 && decodedVp?.id) {
    credentialIds.push(decodedVp.id)
  }

  return credentialIds
}

const vpToken = sessions?.tokenResponse?.vp_token || null
const credentialIds = getCredentialIdsFromVpToken(vpToken)


/**
 * Presentation 検証結果を整理する
 *
 * @param {Object} params パラメータ
 * @param {Object[]} params.policyResults Policy Result 一覧
 * @param {string[]} params.credentialIds Credential ID 一覧
 * @param {string[]} params.vcPolicies VC Policy 一覧
 * @param {string[]} params.vpPolicies VP Policy 一覧
 * @returns {Object} 整理後の検証結果
 */
const createPresentationVerifyResult = ({
  policyResults = [],
  credentialIds = [],
  vcPolicies = [],
  vpPolicies = [],
}) => {
  let presentation = {}
  let credentials = {}

  policyResults.forEach((item1, index) => {
    const list = item1?.policyResults || []

    const credentialId = index > 0 ? credentialIds[index - 1] : null
    let credential = credentialId ? { [credentialId]: {} } : {}

    list.forEach((item2) => {
      const { policy, is_success: isSuccess } = item2

      if (vpPolicies.includes(policy)) {
        presentation = {
          ...presentation,
          [policy]: isSuccess,
        }
      }

      if (vcPolicies.includes(policy) && credentialId) {
        credential[credentialId] = {
          ...credential[credentialId],
          [policy]: isSuccess,
        }
      }
    })

    if (credentialId) {
      credentials = {
        ...credentials,
        ...credential,
      }
    }
  })

  return {
    presentation,
    credentials,
  }
}

const policyResults = sessions?.policyResults?.results || []

const { presentation, credentials } = createPresentationVerifyResult({
  policyResults,
  credentialIds,
  vcPolicies: vc_policies,
  vpPolicies: vp_policies,
})

const result = {
  presentation,
  credentials,
}


/**
 * VP 検証結果を Verifier API に保存する
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Realm 名
 * @param {string} params.groupId グループID
 * @param {string} params.state State
 * @param {string} params.vpToken VP Token
 * @param {string} params.userName ユーザ名
 * @param {Object} params.result 検証結果
 * @returns {Promise<void>}
 */
const saveVpResult = async ({
  realmName,
  groupId,
  state,
  vpToken,
  userName,
  result,
}) => {
  if (!groupId) {
    logger.debug('groupIdが指定されていないため、VP保存をスキップします。')
    return
  }

  const accessToken = await getWalletApiPatToken({ realmName })

  const targetVerifier = verifiers?.[groupId]
  const api = targetVerifier.apis.saveVp.replace(':groupId', groupId)
  const url = targetVerifier.url + api

  logger.debug('url: ', url)

  const response = await handlePost(url, accessToken, {
    state,
    vp_token: vpToken,
    user_id: userName,
    verify_result_string: JSON.stringify(result),
  })

  const status = response?.status ?? 500

  logger.debug('response.status: ', status)

  if (!(status === 200 || status === 409)) {
    const error = new Error('Failed to save VP.')
    error.code = 'InternalServerError'

    throw error
  }
}

await saveVpResult({
  realmName,
  groupId,
  state,
  vpToken,
  userName,
  result,
})


/**
 * HTTP status に応じてデフォルトの error code を設定する
 *
 * error.code が既に定義されている場合は、その値をそのまま使用する。
 *
 * @param {Error} error エラー
 * @returns {Error} error code 設定後のエラー
 */
const setDefaultErrorCodeByStatus = (error) => {
  if (error.code) {
    return error
  }

  switch (String(error.status)) {
    case '400':
      error.code = 'InvalidRequestError'
      break

    case '401':
      error.code = 'AuthenticationError'
      break

    case '403':
      error.code = 'ForbiddenRequestError'
      break

    case '404':
      error.code = 'ResourceNotFoundError'
      break

    default:
      error.code = 'InternalServerError'
      break
  }

  return error
}

/**
 * エラー情報をログ出力し、HTTP status に応じてデフォルトの error code を設定する
 *
 * @param {Error} error エラー
 * @returns {Error} error code 設定後のエラー
 */
const handleServiceError = (error) => {
  logger.error('error.message: ', error.message)
  logger.error('error.stack: ', error.stack)

  return setDefaultErrorCodeByStatus(error)
}

// } catch (error) {
//   throw handleServiceError(error)
// }
