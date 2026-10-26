
#### `wallet_app.account_wallets`

アカウントと Wallet の関連情報を管理するテーブルです。

v0.15.1 の `account_wallet_mapping` と `wallets` の情報をもとに、Account と Wallet の紐付け、および Wallet 名を保持します。

#### `wallet_app.did_aliases`

Wallet ごとの DID 名（Alias）を管理するテーブルです。

v0.15.1 の `wallet_dids.alias` を移行し、DID 名の参照・更新に使用します。
