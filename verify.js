-- * Credential Offer URLの有効期間（秒）を追加
ALTER TABLE add_cert ADD COLUMN IF NOT EXISTS credential_offer_expiration_seconds INTEGER DEFAULT NULL;

-- * Credential Offer URLが未設定の場合、有効期間をNULLに設定
UPDATE add_cert
SET credential_offer_expiration_seconds = NULL
WHERE credential_offer_url IS NULL
  AND credential_offer_expiration_seconds IS NOT NULL;

-- * Credential Offer URLが設定済みの場合、有効期間の初期値を300秒に設定
UPDATE add_cert
SET credential_offer_expiration_seconds = 300
WHERE credential_offer_url IS NOT NULL
  AND credential_offer_expiration_seconds IS NULL;






/**
 * Credential Offer URL一覧を取得する
 * @param {object} params パラメータ
 * @returns {Promise<object>} Credential Offer URL一覧
 */
const listCredentialOfferURLs = async (params) => {
    logger.debug('*** listCredentialOfferURLs start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const { realmName, kcUser, groupId } = params

    let result = {}

    try {
        const values = [groupId]

        let sql = 'SELECT '
        sql += 'a.doc_id, '
        sql += 'a.group_id, '
        sql += 'a.category, '
        sql += 'a.vc_info, '
        sql += 'a.credential_offer_url, '
        sql += 'a.credential_offer_expiration_seconds, '
        sql += 'a.credential_offer_endpoint, '
        sql += 'a.issuer, '
        sql += 'a.type, '
        sql += 'a.format, '
        sql += 'a.auth_type, '
        sql += 'a.cert_name, '
        sql += 'a.image_url, '
        sql += 'a.create_date, '
        sql += 'a.update_date, '
        sql += 'b.name, '
        sql += 'c.user_id '
        sql += 'FROM add_cert a '
        sql += 'INNER JOIN issuer b ON b.group_id = a.group_id '
        sql += 'INNER JOIN add_cert_user c ON c.doc_id = a.doc_id AND c.group_id = a.group_id '
        sql += 'WHERE a.group_id = $1 '

        // Credential Offer URLの有効期間（秒）を確認する
        sql += 'AND ( '
        sql += 'a.credential_offer_url IS NULL '
        sql += 'OR a.credential_offer_expiration_seconds IS NULL '
        sql += "OR a.create_date + (a.credential_offer_expiration_seconds * INTERVAL '1 second') > NOW() "
        sql += ') '

        // 個人Realmの場合はユーザIDで絞り込む
        if (realmName === keycloak.allowedRealms.individual) {
            sql += 'AND c.user_id = $2 '
            values.push(kcUser.preferred_username)
        }

        sql += 'ORDER BY a.create_date DESC '

        const { rows } = await walletDBService.walletDBPool.query(sql, values)

        const datas = rows.map(mapRow)

        // logger.debug('datas: ', JSON.stringify(datas, null, 2))

        const list = createCredentialOfferUrlListResponse(datas, 'userId')

        result = { list: list }

        // logger.debug('result: ', JSON.stringify(result, null, 2))

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** listCredentialOfferURLs end ***')
    }
}





