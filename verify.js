パラメータから以下の情報を取得する。

- DID：リクエストパラメータで指定された DID

—————————————————

アクセストークンの Realm 名からリクエスト用ユーザ情報を取得する。

【個人ユーザの場合】

- ユーザID：リクエストパラメータで指定されたユーザID（`accessToken.sub`）

—————————————————

取得したユーザIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、Wallet 情報が存在するか確認する。

■検索条件

- `user_id`：取得したユーザID

Wallet 情報が存在しない場合、`WalletNotFoundError` を返却する。

Wallet 情報が存在する場合、`waltid_wallet` を walt.id Wallet ID として取得する。

—————————————————

walt.id Wallet API を呼び出し、Wallet 情報を取得する。

■エンドポイント

GET /wallet/{walletId}

■パスパラメータ

- `walletId`：取得した walt.id Wallet ID

取得した Wallet 情報から、デフォルト DID（`defaultDidId`）を取得する。

—————————————————

DIDエイリアス情報テーブル（`did_aliases`）を検索し、指定された DID が当該 Wallet に存在することを確認する。

■検索条件

- `waltid_wallet_id`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

対象 DID が存在しない場合、`ResourceNotFoundError` を返却する。

対象 DID が存在する場合、当該 DID に紐づく `key_id` を取得する。

—————————————————

削除対象の DID がデフォルト DID かどうかを確認する。

■判定条件

- Wallet 情報の `defaultDidId` と、リクエストパラメータの `did` が一致する場合

デフォルト DID の場合、`InvalidParamsError` を返却する。

デフォルト DID ではない場合、後続処理を実施する。

—————————————————

walt.id Wallet API を呼び出し、指定された DID を削除する。

■エンドポイント

DELETE /wallet/{walletId}/dids/{did}

■パスパラメータ

- `walletId`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

■リクエストボディ

なし

—————————————————

walt.id Wallet API を呼び出し、対象 DID に紐づく Key を削除する。

■エンドポイント

DELETE /wallet/{walletId}/keys/{keyId}

■パスパラメータ

- `walletId`：取得した walt.id Wallet ID
- `keyId`：DIDエイリアス情報テーブルから取得した Key ID

■リクエストボディ

なし

—————————————————

DIDエイリアス情報テーブル（`did_aliases`）から対象 DID 情報を削除する。

■削除条件

- `waltid_wallet_id`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

—————————————————

成功レスポンスを返却する。

処理中に上記以外のエラーが発生した場合、`InternalServerError` を返却する。
