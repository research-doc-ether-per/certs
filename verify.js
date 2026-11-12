**処理名：ウォレット作成**

**概要：Waltidウォレットを作成する。**

**処理内容**

ウォレット管理API認証を実施する。

パラメータの必須チェックを実施する。

以下の場合エラーを返却する。
- 必須情報が存在しない場合：RequireParamsNotFoundError

パラメータから情報を取得する。

アクセストークンのRealm名から個人ユーザー／組織ユーザーを判定する。
- CertAuth：個人ユーザー
- GroupCertAuth：組織ユーザー

【個人ユーザーの場合】
アクセストークンの`sub`をユーザーIDとして取得する。

【組織ユーザーの場合】
アクセストークンの`iss`とリクエストパラメータで指定された組織ウォレットIDを結合し、ユーザーIDとして取得する。

取得したユーザーIDをキーにCloud Walletの個人ウォレットテーブル（`priv_wallets`）を検索し、既にウォレット情報が存在するか確認する。

【検索条件】
- `user_id`：取得したユーザーID

以下の場合エラーを返却する。
- ウォレット情報が存在する場合：WalletAlreadyExistsError
- ウォレット情報が存在しない場合：以下の処理を続ける。

共通処理「Waltidウォレット作成」を実施し、ウォレット、KeyおよびDIDを作成する。

Cloud Walletの個人ウォレットテーブル（`priv_wallets`）に以下の情報を登録する。

【登録情報】
- `user_id`：取得したユーザーID
- `waltid_wallet`：作成したWaltidのウォレットID

Cloud Walletのウォレットエイリアス情報テーブル（`wallet_aliases`）に以下の情報を登録する。

【登録情報】
- `waltid_wallet_id`：作成したWaltidのウォレットID
- `wallet_name`：
  - 個人ユーザーの場合：`Wallet of ${kcUser.name}`
  - 組織ユーザーの場合：`Wallet of ${groupId}`

Cloud WalletのDIDエイリアス情報テーブル（`did_aliases`）に以下の情報を登録する。

【登録情報】
- `waltid_wallet_id`：作成したWaltidのウォレットID
- `did`：作成したDID
- `alias`：`Initial_DID`
- `key_id`：生成したKeyのID

※各テーブルの`created_on`にはデフォルト値（CURRENT_TIMESTAMP）を設定する。

成功レスポンスを返却する。

エラーが発生した場合、Cloud Wallet DBのトランザクションをロールバックする。また、Waltidで作成したウォレットの削除を実施する。

※処理中に上記記載以外のエラーが発生した場合、InternalServerErrorを返却する。
