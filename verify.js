**処理名：個人DID削除**

**処理内容**

DID管理API認証を実施する。

共通処理「DID管理API認証」参照。

————————

パラメータの必須チェックを実施する。

以下の場合、エラーを返却する。
- 必須情報が存在しない場合：`RequireParamsNotFoundError`

————————

パラメータ、アクセストークンから以下の情報を取得する。

- ユーザーID：アクセストークンの `sub`（`accessToken.sub`）
- DID：リクエストパラメータで指定されたDID

————————

ユーザーIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、ウォレット情報が存在するか確認する。

【検索条件】
- `user_id`：取得したユーザーID

以下の場合、エラーを返却する。
- ウォレット情報が存在しない場合：`WalletNotFoundError`

ウォレット情報が存在する場合、`waltid_wallet` をWaltidウォレットIDとして取得する。

————————

Waltid Wallet APIのウォレット取得を呼び出し、ウォレット情報を取得する。

エンドポイント：`/wallet/{walletId}`

メソッド：GET

パスパラメータ：
- `walletId`：取得したWaltidウォレットID

取得したウォレット情報からデフォルトDID（`defaultDidId`）を取得する。

————————

削除対象のDIDがデフォルトDIDかどうかを確認する。

- デフォルトDIDの場合：`InvalidParamsError` を返却する。
- デフォルトDIDではない場合：後続処理を実施する。

【判定条件】
- `defaultDidId` とリクエストパラメータの `did` が一致する場合

エラーパラメータ：
- `did`：削除対象のDID

————————

Waltid Wallet APIのDID削除を呼び出し、指定されたDIDを削除する。

エンドポイント：`/wallet/{walletId}/dids/{did}`

メソッド：DELETE

パスパラメータ：
- `walletId`：取得したWaltidウォレットID
- `did`：リクエストパラメータで指定されたDID

リクエストボディ：なし

————————

DIDエイリアス情報テーブル（`did_aliases`）から対象のDID情報を削除する。

【削除条件】
- `waltid_wallet_id`：取得したWaltidウォレットID
- `did`：リクエストパラメータで指定されたDID

————————

成功レスポンスを返却する。

————————

処理中に上記記載以外のエラーが発生した場合、`InternalServerError` を返却する。
