/**
 * Presentation Request を解決し、Presentation Request 情報を取得する
 *
 * @param {Object} params パラメータ
 * @param {string} params.walletId Wallet ID
 * @param {string} params.accessToken Walt.id Wallet API アクセストークン
 * @param {string} params.presentationUri Presentation Request URL
 * @returns {Promise<Object>} Presentation Request 情報
 */
const resolvePresentationRequestInfo = async ({
  walletId,
  accessToken,
  presentationUri,
}) => {
  let presentationRequest

  try {
    presentationRequest = await resolvePresentationRequest({
      walletId,
      accessToken,
      presentationUri,
    })
  } catch (error) {
    if (
      String(error.status) === '500' &&
      error.response?.data?.id === 'AuthorizationError'
    ) {
      error.code = 'PresentationRequestUrlExpiredError'
    }

    throw error
  }

  const presentationUrl = new URL(presentationRequest)
  const presentationDefinition = presentationUrl.searchParams.get(
    'presentation_definition'
  )

  return {
    presentationRequest,
    presentationDefinition,
  }
}
