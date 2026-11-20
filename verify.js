パラメータから以下の情報を取得する。

- DID：リクエストパラメータで指定された DID
- DID名：リクエストボディで指定された `name`

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

DIDエイリアス情報テーブル（`did_aliases`）を検索し、指定された DID が当該 Wallet に存在することを確認する。

■検索条件

- `waltid_wallet_id`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

対象 DID が存在しない場合、`ResourceNotFoundError` を返却する。

—————————————————

DIDエイリアス情報テーブル（`did_aliases`）の対象 DID のエイリアス名を更新する。

■更新条件

- `waltid_wallet_id`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

■更新情報

- `alias`：リクエストボディで指定された DID名（`name`）

—————————————————

レスポンス情報を整理し、返却する。

■レスポンス情報

- `did`：リクエストパラメータで指定された DID
- `alias`：更新した DID名

処理中に上記以外のエラーが発生した場合、`InternalServerError` を返却する。









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

DIDエイリアス情報テーブル（`did_aliases`）を検索し、指定された DID が当該 Wallet に存在することを確認する。

■検索条件

- `waltid_wallet_id`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

対象 DID が存在しない場合、`ResourceNotFoundError` を返却する。

対象 DID が存在する場合、当該 DID に紐づく `key_id` を取得する。

—————————————————

walt.id Wallet API を呼び出し、指定された DID をデフォルト DID に設定する。

■エンドポイント

PUT /wallet/{walletId}/dids/{did}/set-default

■パスパラメータ

- `walletId`：取得した walt.id Wallet ID
- `did`：リクエストパラメータで指定された DID

■リクエストボディ

なし

—————————————————

walt.id Wallet API を呼び出し、指定された DID に紐づく Key をデフォルト Key に設定する。

■エンドポイント

PUT /wallet/{walletId}/keys/{keyId}/set-default

■パスパラメータ

- `walletId`：取得した walt.id Wallet ID
- `keyId`：DIDエイリアス情報テーブルから取得した Key ID

■リクエストボディ

なし

—————————————————

成功レスポンスを返却する。

処理中に上記以外のエラーが発生した場合、`InternalServerError` を返却する。



