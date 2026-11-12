Cloud Walletの個人ウォレットテーブル（`priv_wallets`）とウォレットエイリアス情報テーブル（`wallet_aliases`）を結合し、以下の情報を取得する。

【結合条件】
- `priv_wallets.waltid_wallet` = `wallet_aliases.waltid_wallet_id`

【取得条件】
- `priv_wallets.user_id`：取得したユーザーID

【取得情報】
- `id`：`priv_wallets.waltid_wallet`
- `name`：`wallet_aliases.wallet_name`
- `createdOn`：`wallet_aliases.created_on`

取得した情報からレスポンスを生成する。

- `wallets`：取得したウォレット情報を配列に設定する。
  - `id`：取得した`id`
  - `name`：取得した`name`
  - `createdOn`：取得した`createdOn`

ウォレット情報が取得できなかった場合、空のオブジェクトを設定する。

生成したウォレット情報を返却値として設定し、成功レスポンスを返却する。
