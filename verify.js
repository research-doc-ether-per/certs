
/**
 * 組織 Wallet 認証用 password を取得する
 *
 * Wallet が既に存在する場合は DB から登録済み password を取得する。
 * Wallet が存在しない場合は、組織ユーザIDをもとに password hash を生成する。
 *
 * @param {Object} params パラメータ
 * @param {string} params.organizationUserId 組織ユーザID
 * @param {boolean} [params.hasWallet=false] Wallet 情報が存在するかどうか
 * @returns {Promise<string>} 組織 Wallet 認証用 password
 */
const getOrganizationWalletAuthPassword = async ({
  organizationUserId,
  hasWallet = false,
}) => {
  if (hasWallet) {
    const result = await walletDBService.select('org_wallet_id', {
      id: organizationUserId,
    })

    const password = result?.[0]?.password

    if (!password) {
      const error = new Error(
        `Organization wallet password not found. id: ${organizationUserId}`
      )
      error.code = 'InvalidRequestError'
      error.params = []

      throw error
    }

    return password
  }

  return createPassHash(organizationUserId)
}
