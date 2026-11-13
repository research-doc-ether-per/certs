
/**
 * ウォレット作成サービス。
 * @param {Object} params パラメータ
 * @param {string} params.userId ユーザーID
 * @param {string} params.walletName ウォレット名
 * @returns {Promise<Object>} 作成したウォレット情報
 */
const createWallet = async ({ userId, walletName }) => {
    logger.debug('*** createWallet start ***')

    let walletId

    try {
        return await walletDBService.withTransaction(async (client) => {
            await checkPersonalWallet(userId, client)

            // Waltidウォレット作成
            const wallet = await wallet2Service.createWallet()
            walletId = wallet.walletId
            if (!walletId) throw new Error('walletId is not found.')

            // Key生成
            const key = await wallet2Service.generateKey(walletId)
            const keyId = key.keyId
            if (!keyId) throw new Error('keyId is not found.')

            // デフォルトKey設定
            await wallet2Service.setDefaultKey(walletId, keyId)

            // DID作成
            const didJwk = await wallet2Service.createDid(
                walletId,
                keyId,
                null,
                'jwk',
                {}
            )
            if (!didJwk?.did) throw new Error('did is not found.')

            // デフォルトDID設定
            await wallet2Service.setDefaultDid(walletId, didJwk.did)

            // 個人ウォレットテーブル登録
            await walletDBService._insert(client, 'priv_wallets', {
                user_id: userId,
                waltid_wallet: walletId,
            })

            // ウォレットエイリアス情報テーブル登録
            const insertResult = await walletDBService._insert(
                client,
                'wallet_aliases',
                {
                    waltid_wallet_id: walletId,
                    wallet_name: walletName,
                }
            )

            // DIDエイリアス情報テーブル登録
            await walletDBService._insert(client, 'did_aliases', {
                waltid_wallet_id: walletId,
                did: didJwk.did,
                alias: 'Initial_DID',
                key_id: keyId,
            })

            return {
                id: walletId,
                name: walletName,
                created_on: insertResult.rows[0].created_on,
                did: didJwk.did,
            }
        })
    } catch (error) {
        // DBロールバック後、作成したWaltidウォレットを削除
        if (walletId) {
            try {
                await wallet2Service.deleteWallet(walletId)
            } catch (deleteError) {
                logger.error('Failed to delete Waltid wallet:', deleteError)
            }
        }

        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createWallet end ***')
    }
}






/**
 * 個人ウォレット作成サービス。
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 処理結果
 */
const createPersonalWallet = async (params) => {
    logger.debug('*** createPersonalWallet start ***')

    try {
        const { kcUser, realmName } = params
        const { userId, groupId } =
            getRequestUserInfoByRealmName(params)

        const walletName = `Wallet of ${
            realmName === keycloak.allowedRealms.individual
                ? kcUser.name
                : groupId
        }`

        return await createWallet({ userId, walletName })
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** createPersonalWallet end ***')
    }
}




/**
 * 組織ウォレット一覧取得サービス。
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 組織ウォレット一覧
 */
const getOrgWalletList = async (params) => {
    logger.debug('*** getOrgWalletList start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    try {
        const { kcUser } = params
        const walletList = []

        for (const groupId of kcUser.groups) {
            const userId = `${kcUser.iss}${groupId}`

            let walletInfo

            // ウォレット存在チェック
            const exists = await hasPersonalWallet(userId, false)

            if (!exists) {
                // ウォレットが存在しない場合、新規作成
                walletInfo = await createWallet({
                    userId,
                    walletName: `Wallet of ${groupId}`,
                })
            } else {
                // ウォレットが存在する場合、DBから取得
                const result = await getPersonalWalletFromDB(userId)
                walletInfo = result.wallets?.[0]

                if (!walletInfo) {
                    throw new Error(
                        `Wallet information is not found. userId: ${userId}`
                    )
                }

                // DID一覧取得
                const dids = await wallet2Service.getDids(walletInfo.id)

                walletInfo = {
                    ...walletInfo,
                    did: dids[0]?.did ?? null,
                }
            }

            walletList.push({
                ...walletInfo,
                groupId,
            })
        }

        const result = { walletList }

        logger.debug('result: ', JSON.stringify(result, null, 2))
        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** getOrgWalletList end ***')
    }
}














