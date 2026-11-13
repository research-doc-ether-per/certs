**処理名：個人DID取得**

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
- DID：リクエストパラメータで指定されたDID

————————

ユーザーIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、ウォレット情報が存在するか確認する。

【検索条件】
- `user_id`：取得したユーザーID

ウォレット情報が存在しない場合、`WalletNotFoundError` を返却する。

ウォレット情報が存在する場合、`waltid_wallet` をWaltidウォレットIDとして取得する。

————————

Waltid Wallet APIのDID取得を呼び出し、対象DIDの情報を取得する。

エンドポイント：`/wallet/{walletId}/dids/{did}`

メソッド：GET

パラメータ：
- `walletId`：個人ウォレットテーブルから取得したWaltidウォレットID
- `did`：リクエストパラメータで指定されたDID

————————

取得したDID情報の `document` をレスポンスデータとして設定し、成功レスポンスを返却する。

- `document`：DID Document（JSONオブジェクト）

※DID情報に `document` が存在しない場合、空オブジェクト（`{}`）を返却する。

————————

処理中に上記記載以外のエラーが発生した場合、`InternalServerError` を返却する。
