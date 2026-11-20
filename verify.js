/**
 * DID から Public JWK を取得する
 *
 * @param {string} walletId walt.id Wallet ID
 * @param {string} did DID
 * @returns {Promise<Object>} Public JWK
 */
const getPublicJwkFromDid = async (walletId, did) => {
  logger.debug('*** getPublicJwkFromDid start ***')
  logger.debug('walletId: ', walletId)
  logger.debug('did: ', did)

  try {
    const datas = await walletDBService.select('did_aliases', {
      waltid_wallet_id: walletId,
      did,
    })

    if (datas.length === 0) {
      const error = new Error(
        `User does not own this DID. did: ${did}`
      )
      error.code = 'ResourceNotFoundError'
      error.params = [did]
      throw error
    }

    let document = datas[0].document

    if (typeof document === 'string') {
      document = JSON.parse(document)
    }

    const verificationMethod =
      document?.verificationMethod?.find(
        (item) => item.publicKeyJwk
      )

    if (!verificationMethod?.publicKeyJwk) {
      throw new Error(
        `Public JWK not found. did: ${did}`
      )
    }

    const {
      d,
      p,
      q,
      dp,
      dq,
      qi,
      oth,
      ...publicJwk
    } = verificationMethod.publicKeyJwk

    return publicJwk
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('*** getPublicJwkFromDid end ***')
  }
}
