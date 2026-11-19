/**
 * 追加可能証明書一覧取得サービス
 *
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 追加可能証明書一覧
 */
const listAddableCredentials = async (params) => {
  logger.debug('*** listAddableCredentials start ***')
  logger.debug('params: ', JSON.stringify(params, null, 2))

  const { realmName } = params

  let result = {}

  try {
    // Realm 名に応じてリクエスト用ユーザ情報を取得
    const { userId, userName } =
      getRequestUserInfoByRealmName(params)

    // 個人ウォレット存在かどうかのチェック
    const { wallet } = await hasPersonalWallet(userId, true)
    const walletId = wallet.waltidWallet

    let sql = ''
    let values = []

    // 個人ユーザの場合
    if (realmName === keycloak.allowedRealms.individual) {
      sql = `
        SELECT
          a.doc_id,
          a.category,
          a.vc_info,
          a.credential_offer_url,
          a.credential_offer_endpoint,
          a.credential_offer_id,
          a.credential_offer_expires_at,
          a.issuer,
          a.type,
          a.format,
          a.auth_type,
          a.cert_name,
          a.create_date,
          a.update_date,
          c.user_id
        FROM add_cert a
        INNER JOIN issuer b
          ON b.group_id = a.group_id
        INNER JOIN add_cert_user c
          ON c.doc_id = a.doc_id
          AND c.group_id = a.group_id
        WHERE c.user_id = $1
          AND (
            a.credential_offer_url IS NULL
            OR a.credential_offer_expires_at IS NULL
            OR a.credential_offer_expires_at
              > (EXTRACT(EPOCH FROM NOW()) * 1000)
          )
        ORDER BY a.create_date DESC
      `

      values = [userName]
    }

    // 組織ユーザの場合
    if (realmName === keycloak.allowedRealms.organization) {
      // 組織 Wallet のデフォルト DID を取得
      const walletInfo = await wallet2Service.getWallet(walletId)

      logger.debug(
        'walletInfo: ',
        JSON.stringify(walletInfo, null, 2)
      )

      const orgWalletDid = walletInfo.defaultDidId || null

      sql = `
        SELECT
          a.doc_id,
          a.category,
          a.vc_info,
          a.credential_offer_url,
          a.credential_offer_endpoint,
          a.credential_offer_id,
          a.credential_offer_expires_at,
          a.issuer,
          a.type,
          a.format,
          a.auth_type,
          a.cert_name,
          a.create_date,
          a.update_date,
          c.org_wallet_did
        FROM org_add_cert a
        INNER JOIN issuer b
          ON b.group_id = a.group_id
        INNER JOIN org_add_cert_user c
          ON c.doc_id = a.doc_id
          AND c.group_id = a.group_id
        WHERE c.org_wallet_did = $1
          AND (
            a.credential_offer_url IS NULL
            OR a.credential_offer_expires_at IS NULL
            OR a.credential_offer_expires_at
              > (EXTRACT(EPOCH FROM NOW()) * 1000)
          )
        ORDER BY a.create_date DESC
      `

      values = [orgWalletDid]
    }

    const { rows } =
      await walletDBService.walletDBPool.query(sql, values)

    const datas = rows.map(mapRow)

    const list = []

    for (const data of datas) {
      const {
        createDate,
        updateDate,
        ...others
      } = data

      list.push({
        ...others,
        imageUrl: null,
        name: null,
        updateDate: convertToUtcUnix(updateDate),
        createDate: convertToUtcUnix(createDate),
      })
    }

    result = {
      list,
    }

    logger.debug(
      'result: ',
      JSON.stringify(result, null, 2)
    )

    return result
  } catch (error) {
    logger.error('error.message: ', error.message)
    logger.error('error.stack: ', error.stack)

    throw error
  } finally {
    logger.debug('*** listAddableCredentials end ***')
  }
}
