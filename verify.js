**処理名：個人DIDデフォルト設定**

**処理内容**

DID管理API認証を実施する。

共通処理「DID管理API認証」参照。

————————

パラメータの必須チェックを実施する。

以下の場合、エラーを返却する。
- 必須情報が存在しない場合：`RequireParamsNotFoundError`

————————

パラメータ、アクセストークンから以下の情報を取得する。

- ユーザーID：リクエストパラメータで指定されたユーザーID（`accessToken.sub`）
- DID：リクエストパラメータで指定されたDID

————————

ユーザーIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、既にウォレット情報が存在するか確認する。

【検索条件】
- `user_id`：取得したユーザーID

以下の場合、エラーを返却する。
- ウォレット情報が存在しない場合：`WalletNotFoundError`

ウォレット情報が存在する場合、`waltid_wallet` をWaltidウォレットIDとして取得する。

————————

Waltid Wallet APIのDIDデフォルト設定を呼び出し、指定されたDIDをデフォルトDIDに設定する。

エンドポイント：`/wallet/{walletId}/dids/{did}/set-default`

メソッド：PUT

パスパラメータ：
- `walletId`：取得したWaltidウォレットID
- `did`：リクエストパラメータで指定されたDID

リクエストボディ：なし

————————

成功レスポンスを返却する。

————————

処理中に上記記載以外のエラーが発生した場合、`InternalServerError` を返却する。
