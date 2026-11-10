**処理名：Waltidウォレット取得**

**概要：Waltidウォレット情報を取得する。**

**処理内容**

アクセストークンのRealm名から個人ユーザー／組織ユーザーを判定する。
- CertAuth：個人ユーザー
- GroupCertAuth：組織ユーザー

【個人ユーザーの場合】
アクセストークンの`sub`をユーザーIDとして取得する。

【組織ユーザーの場合】
アクセストークンの`iss`とリクエストパラメータで指定された組織ウォレットIDを結合し、ユーザーIDとして取得する。

Cloud Walletの個人ウォレットテーブル（`priv_wallets`）から、以下の情報を取得する。
【取得条件】
- `user_id`：取得したユーザーID

【取得情報】
- `account_id`

取得したAccount IDを使用して、Cloud Walletのアカウント・ウォレット関連テーブル（`account_wallets`）からウォレット情報を取得する。
【取得条件】
- `account_id`：取得したAccount ID

【取得情報】
- `wallet_id`
- `wallet_name`
- `added_on`

取得したAccount IDおよびウォレット情報を返却する。



ウォレット管理API認証を実施する。

※共通処理「ウォレット管理API認証」参照

パラメータの必須チェックを実施する。

以下の場合エラーを返却する。

- 必須情報が存在しない場合：RequireParamsNotFoundError

パラメータから情報を取得する。

Waltidウォレット取得を実施し、Account IDおよびウォレット情報を取得する。
※共通処理「Waltidウォレット取得」参照

取得した情報からレスポンスを生成する。
- `account`：取得したAccount ID
- `wallets`：取得したウォレット情報を配列に設定する。
    - `id`：`wallet_id`
    - `name`：`wallet_name`
    - `addedOn`：`added_on`

生成したウォレット情報を返却値として設定し、成功レスポンスを返却する。

※処理中に上記以外のエラーが発生した場合、InternalServerErrorを返却する。
