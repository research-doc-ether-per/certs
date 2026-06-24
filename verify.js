/**
 * 検証セッションを作成する。
 *
 * @param {Object} params リクエストパラメータ（DCQLクエリやポリシーを含む）
 * @returns {Promise<Object>} 検証セッション初期化情報（sessionIdやURLを含む）
 */
const createVerificationSession = async (params) => {
  logger.debug('*** createVerificationSession start ***')
  logger.debug('params: ', JSON.stringify(params, null, 2))

  try {
    const url = '/verification-session/create'
    logger.debug('url: ', url)

    const response = await fetchService.handlePost(
      fetchService.verifierApi,
      url,
      null,
      params,
      null
    )

    const result = response.data
    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** createVerificationSession end ***')
  }
}


/**
 * ウォレットからの検証応答（vp_token）を受け取り、検証を実行する。
 *
 * @param {string} sessionOrStateId 検証セッションID
 * @param {Object} params ウォレットから送信されたデータ
 * @returns {Promise<Object>} 検証結果
 */
const verifyVerificationSessionResponse = async (sessionOrStateId, params) => {
  logger.debug('*** verifyVerificationSessionResponse start ***')
  logger.debug('sessionOrStateId: ', sessionOrStateId)
  logger.debug('params: ', JSON.stringify(params, null, 2))

  try {
    const url = `/verification-session/${sessionOrStateId}/response`
    logger.debug('url: ', url)

    const response = await fetchService.handlePost(
      fetchService.verifierApi,
      url,
      null,
      params,
      null
    )

    const result = response.data
    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** verifyVerificationSessionResponse end ***')
  }
}

/**
 * 既存の検証セッションの状態および結果情報を取得する。
 *
 * @param {string} sessionId 検証セッションID
 * @returns {Promise<Object>} セッション詳細情報およびポリシー検証結果
 */
const getVerificationSessionInfo = async (sessionId) => {
  logger.debug('*** getVerificationSessionInfo start ***')
  logger.debug('sessionId: ', sessionId)

  try {
    const url = `/verification-session/${sessionId}/info`
    logger.debug('url: ', url)

    const response = await fetchService.handleGet(
      fetchService.verifierApi,
      url,
      null,
      null
    )

    const result = response.data
    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getVerificationSessionInfo end ***')
  }
}
