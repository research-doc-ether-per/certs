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


## Credential Offer URL一覧取得

### 処理内容

個人ユーザまたはIssuer管理者専用API認証処理を実施する。

共通処理「個人ユーザまたはIssuer管理者専用API認証」を参照する。

---

リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合は、`RequireParamsNotFoundError`を返却する。

---

リクエストパラメータから以下の情報を取得する。
・グループID（groupId）

---

追加可能証明書情報テーブル、追加可能証明書対象者情報テーブル、およびIssuer情報テーブルから、以下の条件でCredential Offer URL一覧を取得する。

■ 取得条件（AND条件）
・グループID：追加可能証明書情報テーブルとリクエストで指定されたグループIDが一致すること。
・追加可能証明書ID：追加可能証明書情報テーブルと追加可能証明書対象者情報テーブルの追加可能証明書IDが一致すること。
・グループID：追加可能証明書情報テーブルと追加可能証明書対象者情報テーブルのグループIDが一致すること。
・グループID：追加可能証明書情報テーブルとIssuer情報テーブルのグループIDが一致すること。
・Credential Offer URL：以下のいずれかの条件を満たすこと。
  - Credential Offer URLが未設定（NULL）である。
  - Credential Offer URLの有効期間（秒）が未設定（NULL）である。
  - 追加可能証明書情報の登録日時にCredential Offer URLの有効期間（秒）を加算した日時が、現在日時より後である。
・個人ユーザからのリクエストの場合、追加可能証明書対象者情報テーブルのユーザIDが、認証済みユーザの`preferred_username`と一致すること。

■ 取得情報
・追加可能証明書ID：追加可能証明書情報テーブル
・グループID：追加可能証明書情報テーブル
・カテゴリ：追加可能証明書情報テーブル
・証明書情報：追加可能証明書情報テーブル
・Credential Offer URL：追加可能証明書情報テーブル
・Credential Offer URLの有効期間（秒）：追加可能証明書情報テーブル
・Credential Offer Endpoint：追加可能証明書情報テーブル
・Issuer DID：追加可能証明書情報テーブル
・証明書タイプ：追加可能証明書情報テーブル
・証明書フォーマット：追加可能証明書情報テーブル
・認証方式：追加可能証明書情報テーブル
・証明書名：追加可能証明書情報テーブル
・証明書画像URL：追加可能証明書情報テーブル
・登録日時：追加可能証明書情報テーブル
・最終更新日時：追加可能証明書情報テーブル
・Issuer名：Issuer情報テーブル
・ユーザID：追加可能証明書対象者情報テーブル

■ ソート条件
登録日時の降順

---

取得した情報を追加可能証明書ID単位でまとめ、Credential Offer URL一覧レスポンスを生成する。
・同一の追加可能証明書IDを持つレコードは、1件の証明書情報にまとめる。
・対象者のユーザIDを`targets`に設定する。
・同一ユーザIDが重複する場合は、`targets`に重複して追加しない。
・Credential Offer URLの有効期間（秒）を含む、取得した証明書情報をレスポンスに設定する。

---

生成したCredential Offer URL一覧を返却し、成功レスポンスを返却する。

■ レスポンス
・list：Credential Offer URL一覧

---

処理中に上記以外のエラーが発生した場合は、InternalServerErrorを返却する。


