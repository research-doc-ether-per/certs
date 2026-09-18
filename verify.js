const getAuthorizationRequest = async (
  sessionId,
  accessToken = null
) => {
  logger.debug('*** getAuthorizationRequest start ***')

  try {
    const response = await fetchService.handleGet(
      fetchService.verifierApi2,
      `/verification-session/${sessionId}/request`,
      accessToken
    )

    const result = response.data

    logger.debug('result : ')
    logger.debug(
      typeof result === 'string'
        ? result
        : JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getAuthorizationRequest end ***')
  }
}
