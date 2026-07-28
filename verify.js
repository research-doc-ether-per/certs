/**
 * VP 検証結果を Verifier API に保存する
 *
 * @param {Object} params パラメータ
 * @param {string} params.realmName Realm 名
 * @param {string} params.groupId グループID
 * @param {Object} params.requestBody VP保存APIリクエストボディ
 * @param {string} params.requestBody.state State
 * @param {string} params.requestBody.vpToken VP Token
 * @param {string} params.requestBody.userName ユーザ名
 * @param {Object} params.requestBody.verifyResult 検証結果
 * @returns {Promise<void>}
 */
const saveVpResult = async ({ realmName, groupId, requestBody }) => {
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
    state: requestBody.state,
    vp_token: requestBody.vpToken,
    user_id: requestBody.userName,
    verify_result_string: JSON.stringify(requestBody.verifyResult),
  })

  const status = response?.status ?? 500

  logger.debug('response.status: ', status)

  if (!(status === 200 || status === 409)) {
    const error = new Error('Failed to save VP.')
    error.code = 'InternalServerError'

    throw error
  }
}
