/**
 * Issuer DID から Issuer のグループIDを取得する
 *
 * @param {string} issuerDid Issuer DID
 * @returns {Promise<string>} Issuer のグループID
 */
const getIssuerGroupIdByDid = async (issuerDid) => {
  const issuerData = await walletDBService.select('issuer', {
    did: issuerDid,
  })

  logger.debug('issuerData: ', issuerData)

  const groupId = issuerData?.[0]?.groupId || null

  if (!groupId) {
    const error = new Error(`Issuer groupId not found. issuerDid: ${issuerDid}`)
    error.code = 'ResourceNotFoundError'
    error.params = [issuerDid]

    throw error
  }

  return groupId
}
