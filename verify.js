/**
 * 共通の POST リクエストハンドラー
 *
 * @param {Object} apiInstance AxiosなどのAPIインスタンス
 * @param {string} url エンドポイントのURL
 * @param {string|null} accessToken アクセストークン（不要な場合はnull）
 * @param {Object} params リクエストパラメータ
 * @param {Object} extraHeaders 追加のヘッダー情報
 * @param {...any} axiosOptions その他のAxiosオプション
 * @returns {Promise<Object>} APIレスポンス
 */
const handlePost = async (
  apiInstance,
  url,
  accessToken,
  params,
  extraHeaders = {},
  ...axiosOptions
) => {
  logger.debug('*** handlePost start ***')

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...extraHeaders,
    }

    return await apiInstance.post(url, params, { headers, ...axiosOptions })
  } catch (error) {
    logAxiosError(error)
    throw error
  } finally {
    logger.debug('*** handlePost end ***')
  }
}

/**
 * mDL用の IACA（Issuing Authority Certification Authority）証明書を発行する。
 *
 * @param {Object} params リクエストパラメータ
 * @returns {Promise<Object>} 作成された IACA 証明書
 */
const onboardIaca = async (params) => {
  logger.debug('*** onboardIaca start ***')

  try {
    const response = await fetchService.handlePost(
      fetchService.issuerApi,
      '/onboard/iso-mdl/iacas',
      null,
      params
    )

    const result = response.data
    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** onboardIaca end ***')
  }
}

/**
 * mDL用の DS（Document Signer）証明書を発行する。
 *
 * @param {Object} params リクエストパラメータ
 * @returns {Promise<Object>} 作成された DS 証明書
 */
const onboardDocumentSigner = async (params) => {
  logger.debug('*** onboardDocumentSigner start ***')

  try {
    const response = await fetchService.handlePost(
      fetchService.issuerApi,
      '/onboard/iso-mdl/document-signers',
      null,
      params
    )

    const result = response.data
    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** onboardDocumentSigner end ***')
  }
}

/**
 * 新しい Issuer をオンボーディング（登録）する。
 *
 * @param {Object} params リクエストパラメータ
 * @returns {Promise<Object>} オンボーディングされた Issuer の情報
 */
const onboardIssuer = async (params) => {
  logger.debug('*** onboardIssuer start ***')

  try {
    const response = await fetchService.handlePost(
      fetchService.issuerApi,
      '/onboard/issuer',
      null,
      params
    )

    const result = response.data
    logger.debug('result: ', JSON.stringify(result, null, 2))

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** onboardIssuer end ***')
  }
}

// 外部モジュールから呼び出せるようにエクスポートします
module.exports = {
  handlePost,
  onboardIaca,
  onboardDocumentSigner,
  onboardIssuer,
}
