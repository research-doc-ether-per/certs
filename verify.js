
/**
 * 組織 Wallet のデフォルト DID を取得する
 *
 * walletId または accessToken が指定されていない場合は、
 * loginData を使用して Walt.id Wallet 情報を取得する。
 *
 * @param {Object} params パラメータ
 * @param {string} [params.walletId] Wallet ID
 * @param {string} [params.accessToken] Walt.id Wallet API アクセストークン
 * @param {Object} params.loginData Walt.id Wallet API ログインデータ
 * @returns {Promise<string | null>} 組織 Wallet のデフォルト DID
 */
const getOrgWalletDefaultDid = async ({
  walletId,
  accessToken,
  loginData,
}) => {
  logger.debug('**** getOrgWalletDefaultDid start ****')

  try {
    let targetWalletId = walletId
    let targetAccessToken = accessToken

    if (!targetWalletId || !targetAccessToken) {
      const walletInfo = await getWaltidWallet({
        ...loginData,
      })

      targetWalletId = walletInfo.walletId
      targetAccessToken = walletInfo.accessToken
    }

    const didList = await listDids({
      walletId: targetWalletId,
      accessToken: targetAccessToken,
    })

    const did = didList?.[0]?.did || null

    logger.debug('did: ', did)

    return did
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)
    throw error
  } finally {
    logger.debug('**** getOrgWalletDefaultDid end ****')
  }
}
