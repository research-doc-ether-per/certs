
/**
 * 個人DID追加サービス。
 * @param {Object} params パラメータ
 * @returns {Promise<Object>} 追加したDID情報
 */
const addPersonalDID = async (params) => {
    logger.debug('*** addPersonalDID start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const { type, name } = params

    try {
        // Realm名に応じてリクエスト用ユーザ情報を取得
        const { userId } = getRequestUserInfoByRealmName(params)

        // 個人ウォレット存在かどうかのチェック
        const { wallet } = await hasPersonalWallet(userId, true)
        const walletId = wallet.waltid_wallet

        let keyId
        let didInfo

        try {
            // WalletにKeyを生成
            const key = await wallet2Service.generateKey(walletId)
            keyId = key.keyId

            if (!keyId) {
                throw new Error('keyId is not found.')
            }

            logger.debug('keyId: ', keyId)

            return await walletDBService.withTransaction(async (client) => {
                switch (type) {
                    case 'jwk':
                        // waltid DID(JWK)作成
                        didInfo = await wallet2Service.createDid(
                            walletId,
                            keyId,
                            null,
                            'jwk',
                            {}
                        )
                        break

                    case 'key':
                        // waltid DID(KEY)作成
                        didInfo = await wallet2Service.createDid(
                            walletId,
                            keyId,
                            null,
                            'key',
                            {}
                        )
                        break

                    default: {
                        const error = new Error(
                            `Invalid DID type: ${type}`
                        )
                        error.code = 'InvalidParamsError'
                        error.params = [type]
                        throw error
                    }
                }

                if (!didInfo?.did) {
                    throw new Error('did is not found.')
                }

                logger.debug(
                    'didInfo: ',
                    JSON.stringify(didInfo, null, 2)
                )

                // DIDエイリアス情報テーブルへデータ挿入
                await walletDBService._insert(client, 'did_aliases', {
                    waltid_wallet_id: walletId,
                    did: didInfo.did,
                    alias: name,
                    key_id: keyId,
                })

                const result = {
                    did: didInfo.did,
                    alias: name,
                }

                logger.debug(
                    'result: ',
                    JSON.stringify(result, null, 2)
                )

                return result
            })
        } catch (error) {
            // DID作成済みの場合、Walletから削除
            if (didInfo?.did) {
                try {
                    await wallet2Service.deleteDid(
                        walletId,
                        didInfo.did
                    )
                } catch (deleteDidError) {
                    logger.error(
                        'Failed to delete DID: ',
                        deleteDidError
                    )
                }
            }

            // Key作成済みの場合、Walletから削除
            if (keyId) {
                try {
                    await wallet2Service.deleteKey(
                        walletId,
                        keyId
                    )
                } catch (deleteKeyError) {
                    logger.error(
                        'Failed to delete Key: ',
                        deleteKeyError
                    )
                }
            }

            logger.error('error.message: ', error.message)
            throw error
        }
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** addPersonalDID end ***')
    }
}

**処理名：個人DID追加**

**処理内容**

DID管理API認証を実施する。

共通処理「DID管理API認証」参照。

————————

パラメータの必須チェックを実施する。

DID種別（`type`）が以下のいずれかであることを確認する。
- `jwk`
- `key`

以下の場合、エラーを返却する。
- 必須情報が存在しない場合：`RequireParamsNotFoundError`
- DID種別が上記以外の場合：`InvalidParamsError`

————————

パラメータ、アクセストークンから以下の情報を取得する。

- ユーザーID：リクエストパラメータで指定されたユーザーID（`accessToken.sub`）
- DID種別：リクエストパラメータで指定された `type`
- DID名：リクエストボディで指定された `name`

————————

ユーザーIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、既にウォレット情報が存在するか確認する。

【検索条件】
- `user_id`：取得したユーザーID

以下の場合、エラーを返却する。
- ウォレット情報が存在しない場合：`WalletNotFoundError`

ウォレット情報が存在する場合、`waltid_wallet` をWaltidウォレットIDとして取得する。

————————

Waltid Wallet APIのKey作成を呼び出し、ウォレットに新しいKeyを生成する。

エンドポイント：`/wallet/{walletId}/keys/generate`

メソッド：POST

パスパラメータ：
- `walletId`：取得したWaltidウォレットID

リクエストボディ：
- `backend`：`jwk`
- `keyType`：`secp256r1`

作成したKey情報から `keyId` を取得する。

`keyId` が取得できない場合、エラーとする。

————————

DBトランザクションを開始する。

————————

DID種別に応じて、Waltid Wallet APIのDID作成を呼び出し、DIDを作成する。

エンドポイント：`/wallet/{walletId}/dids/create`

メソッド：POST

パスパラメータ：
- `walletId`：取得したWaltidウォレットID

リクエストボディ：
- `method`：リクエストパラメータで指定されたDID種別（`jwk` または `key`）
- `keyId`：作成したKey ID
- `options`：空オブジェクト（`{}`）

作成したDID情報から `did` を取得する。

`did` が取得できない場合、エラーとする。

————————

DIDエイリアス情報テーブル（`did_aliases`）にデータを登録する。

【登録情報】
- `waltid_wallet_id`：取得したWaltidウォレットID
- `did`：作成したDID
- `alias`：リクエストボディで指定されたDID名
- `key_id`：作成したKey ID

————————

DBトランザクションをコミットする。

————————

以下の情報をレスポンスデータとして設定し、成功レスポンスを返却する。

- `did`：作成したDID
- `alias`：リクエストボディで指定されたDID名

————————

Key作成後の処理でエラーが発生した場合、以下の補償処理を実施する。

- DBトランザクションが失敗した場合、ロールバックする。
- DIDが作成済みの場合、Waltid Wallet APIのDID削除を呼び出し、作成したDIDを削除する。
- Keyが作成済みの場合、Waltid Wallet APIのKey削除を呼び出し、作成したKeyを削除する。

【DID削除】
- エンドポイント：`/wallet/{walletId}/dids/{did}`
- メソッド：DELETE
- `walletId`：取得したWaltidウォレットID
- `did`：作成したDID

【Key削除】
- エンドポイント：`/wallet/{walletId}/keys/{keyId}`
- メソッド：DELETE
- `walletId`：取得したWaltidウォレットID
- `keyId`：作成したKey ID

※補償処理でエラーが発生した場合はエラーログを出力し、元のエラーを再送出する。

————————

処理中に上記記載以外のエラーが発生した場合、`InternalServerError` を返却する。

