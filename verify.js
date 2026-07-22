
/**
 * Credential Offer Endpoint 名を取得する
 *
 * @param {Object} params
 * パラメータ
 *
 * @param {Object} params.walletDBPool
 * Wallet DB Pool
 *
 * @param {string} params.groupId
 * グループID
 *
 * @param {string} params.credentialOfferEndpoint
 * Credential Offer Endpoint URL
 *
 * @returns {Promise<string | null>}
 * Credential Offer Endpoint 名
 *
 * @throws {Error}
 * Credential Offer Endpoint が存在しない場合、InvalidParamsError を throw する
 */
const getCredentialOfferEndpointName = async ({
  walletDBPool,
  groupId,
  credentialOfferEndpoint,
}) => {
  const endpointUrlWithoutQueryString = removeQueryString(
    credentialOfferEndpoint
  )

  if (!endpointUrlWithoutQueryString) {
    return null
  }

  const rows = await getCredentialOfferEndpoints(
    walletDBPool,
    groupId,
    endpointUrlWithoutQueryString
  )

  const datas = rows.map(mapRow)

  logger.debug('credentialOfferEndpoint datas: ', JSON.stringify(datas, null, 2))

  if (datas.length === 0) {
    const error = new Error(
      `Invalid credential offer endpoint. endpointUrl: ${endpointUrlWithoutQueryString}`
    )
    error.code = 'InvalidParamsError'
    error.params = [endpointUrlWithoutQueryString]

    throw error
  }

  return datas[0].name
}


const credentialOfferEndpointName = await getCredentialOfferEndpointName({
  walletDBPool: walletDBService.walletDBPool,
  groupId,
  credentialOfferEndpoint: baseInfo?.credentialOfferEndpoint,
})

baseInfo.credentialOfferEndpointName = credentialOfferEndpointName
