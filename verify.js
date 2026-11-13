**処理名：DID一覧取得**

**処理内容**

DID管理API認証を実施する。

共通処理「DID管理API認証」参照。

————————

パラメータの必須チェックを実施する。

必須情報が存在しない場合、`RequireParamsNotFoundError` を返却する。

————————

パラメータから情報を取得する。

アクセストークンのRealm名から個人ユーザーを判定する。
- CertAuth：個人ユーザー

【個人ユーザーの場合】
- ユーザーID：リクエストパラメータで指定されたユーザーID（accessToken.sub）

————————

ユーザーIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、既にウォレット情報が存在するか確認する。

【検索条件】
- `user_id`：取得したユーザーID

以下の場合、エラーを返却する。
- ウォレット情報が存在しない場合：`WalletNotFoundError`

————————

Waltid Wallet APIのウォレット取得を呼び出し、ウォレット情報を取得する。

共通処理「Waltidウォレット取得」参照。

取得したウォレット情報の `defaultDidId` をデフォルトDIDの判定に使用する。

————————

Waltid Wallet APIのDID一覧取得を呼び出し、DID一覧を取得する。

エンドポイント：`/wallet/{walletId}/dids`

メソッド：GET

パラメータ：
- `walletId`：個人ウォレットテーブルから取得したWaltidウォレットID

————————

【取得したDIDごとに繰り返し・・・ここから】

DIDエイリアス情報テーブル（`did_aliases`）を検索し、対象DIDのエイリアス情報を取得する。

【検索条件】
- `waltid_wallet_id`：取得したWaltidウォレットID
- `did`：対象DID

【取得情報】
- `alias`：DIDエイリアス名
- `key_id`：Key ID
- `created_on`：作成日時

————————

Waltid Wallet APIから取得したDID情報に、以下の情報を追加し、レスポンス用DID一覧に設定する。

- `did`：DID識別子
- `document`：DID Document（JSONオブジェクト）
- `alias`：DIDエイリアス情報テーブルから取得したエイリアス名
- `keyId`：DIDエイリアス情報テーブルから取得したKey ID
- `createdOn`：DIDエイリアス情報テーブルから取得した作成日時
- `default`：ウォレット情報の `defaultDidId` と対象DIDが一致する場合は `true`、それ以外は `false`


【取得したDIDごとに繰り返し・・・ここまで】

————————

DID一覧を返却値として設定し、成功レスポンスを返却する。

※DIDが存在しない場合、空配列（`[]`）を返却する。

————————

処理中に上記記載以外のエラーが発生した場合、`InternalServerError` を返却する。


DID Document。公開鍵などの情報を含むJSONオブジェクト
