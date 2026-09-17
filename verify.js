
/**
 * Credential の詳細を取得する。
 */
const getCredential = async (
  walletId,
  credentialId,
  accessToken = null
) => {
  logger.debug('*** getCredential start ***')

  try {
    const response = await fetchService.handleGet(
      fetchService.walletApi2,
      `/wallet/${walletId}/credentials/${credentialId}`,
      accessToken
    )

    const result = response.data || {}

    logger.debug('result : ', result)

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getCredential end ***')
  }
}
