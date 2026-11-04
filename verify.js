
/**
 * 組織Credential Offer URL一覧取得サービス
 * @param {object} params パラメータ
 * @returns {Promise<object>} Credential Offer URL一覧
 */
const listOrgCredentialOfferURLs = async (params) => {
    logger.debug('*** listOrgCredentialOfferURLs start ***')
    logger.debug('params: ', JSON.stringify(params, null, 2))

    const { groupId, kcUser } = params

    let result = {}

    try {
        const values = [groupId, kcUser?.sub]

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
        sql += 'a.image_url, '
        sql += 'a.auth_type, '
        sql += 'a.cert_name, '
        sql += 'a.issued_by_user_id, '
        sql += 'a.create_date, '
        sql += 'a.update_date, '
        sql += 'b.name, '
        sql += 'c.org_wallet_did '
        sql += 'FROM org_add_cert a '
        sql += 'INNER JOIN issuer b ON b.group_id = a.group_id '
        sql += 'INNER JOIN org_add_cert_user c ON c.doc_id = a.doc_id AND c.group_id = a.group_id '
        sql += 'WHERE a.group_id = $1 '

        // Credential Offer URLの有効期間（秒）を確認する
        sql += 'AND ( '
        sql += 'a.credential_offer_url IS NULL '
        sql += 'OR a.credential_offer_expiration_seconds IS NULL '
        sql += "OR a.create_date + (a.credential_offer_expiration_seconds * INTERVAL '1 second') > NOW() "
        sql += ') '

        // Credential Offer URL発行者のユーザIDで絞り込む
        sql += 'AND a.issued_by_user_id = $2 '

        // 登録日時の降順で取得する
        sql += 'ORDER BY a.create_date DESC '

        const { rows } = await walletDBService.walletDBPool.query(sql, values)

        const datas = rows.map(mapRow)

        // logger.debug('datas: ', JSON.stringify(datas, null, 2))

        // Credential Offer URL一覧レスポンスを生成する
        const list = createCredentialOfferUrlListResponse(
            datas,
            'orgWalletDid',
            ['issuedByUserId']
        )

        result = { list: list }

        // logger.debug('result: ', JSON.stringify(result, null, 2))

        return result
    } catch (error) {
        logger.error('error.message: ', error.message)
        logger.error('error.stack: ', error.stack)
        throw error
    } finally {
        logger.debug('*** listOrgCredentialOfferURLs end ***')
    }
}


リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、RequireParamsNotFoundErrorを返却する。

---
リクエストパラメータから以下の情報を取得する。
・グループID（groupId）

アクセストークンから以下の情報を取得する。
・認証済みユーザID（sub）

---

組織追加可能証明書情報テーブル、組織追加可能証明書対象者情報テーブル、およびIssuer情報テーブルから、以下の条件でCredential Offer URL一覧を取得する。

■ 条件（AND条件）
・追加可能証明書ID：組織追加可能証明書情報テーブルと組織追加可能証明書対象者情報テーブルの追加可能証明書IDが一致すること。
・グループID：組織追加可能証明書情報テーブル、組織追加可能証明書対象者情報テーブル、およびIssuer情報テーブルのグループIDが一致し、かつリクエストで指定されたグループIDと一致すること。
・Credential Offer URL：以下のいずれかの条件を満たすこと。
  - Credential Offer URLが未設定（NULL）である。
  - Credential Offer URLの有効期間（秒）が未設定（NULL）である。
  - 登録日時にCredential Offer URLの有効期間（秒）を加算した日時が、現在日時より後である。
・Credential Offer URL発行者ユーザID：組織追加可能証明書情報テーブルの発行者ユーザIDが、認証済みユーザのIDと一致すること。

■ 取得情報
・追加可能証明書ID：組織追加可能証明書情報テーブル
・グループID：組織追加可能証明書情報テーブル
・カテゴリ：組織追加可能証明書情報テーブル
・証明書情報：組織追加可能証明書情報テーブル
・Credential Offer URL：組織追加可能証明書情報テーブル
・Credential Offer URLの有効期間（秒）：組織追加可能証明書情報テーブル
・Credential Offer Endpoint：組織追加可能証明書情報テーブル
・Issuer DID：組織追加可能証明書情報テーブル
・証明書タイプ：組織追加可能証明書情報テーブル
・証明書フォーマット：組織追加可能証明書情報テーブル
・証明書画像URL：組織追加可能証明書情報テーブル
・認証方式：組織追加可能証明書情報テーブル
・証明書名：組織追加可能証明書情報テーブル
・Credential Offer URL発行者ユーザID：組織追加可能証明書情報テーブル
・登録日時：組織追加可能証明書情報テーブル
・最終更新日時：組織追加可能証明書情報テーブル
・組織ウォレットDID：組織追加可能証明書対象者情報テーブル

■ ソート条件
・登録日時の降順

---

取得した情報を追加可能証明書ID単位でまとめ、Credential Offer URL一覧レスポンスを生成する。
・同一の追加可能証明書IDを持つレコードは、1件の証明書情報にまとめる。
・組織ウォレットDIDを対象者情報（targets）に設定する。
・同一の組織ウォレットDIDが重複する場合は、targetsに追加しない。
・Credential Offer URL発行者ユーザIDを設定する。
・Credential Offer URLの有効期間（秒）を含む取得情報をレスポンスに設定する。

---

取得した情報を返却値として設定し、成功レスポンスを返却する。

■ レスポンス
・list：Credential Offer URL一覧

---


