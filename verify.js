**処理名：ウォレット作成**

**処理内容**

1. ウォレット管理API認証を実施する。

2. パラメータの必須チェックを実施する。

   以下の場合エラーを返却する。
   - 必須情報が存在しない場合：RequireParamsNotFoundError

3. パラメータから情報を取得する。

   アクセストークンのRealm名から個人ユーザー／組織ユーザーを判定する。

   - CertAuth：個人ユーザー
   - GroupCertAuth：組織ユーザー

   【個人ユーザーの場合】
   - ユーザーID：リクエストパラメータで指定されたユーザーID（accessToken.sub）

   【組織ユーザーの場合】
   - ユーザーID：アクセストークンのiss＋リクエストパラメータで指定された組織ウォレットID（accessToken.groups内のgroup名）
   - 組織ウォレットID：リクエストパラメータで指定された組織ウォレットID

4. DBトランザクションを開始する。

5. 個人ウォレットテーブル（`priv_wallets`）を検索し、対象ユーザーのウォレット情報が既に存在するか確認する。

   ■条件
   - `user_id`：3で取得したユーザーID

   以下の場合エラーを返却する。
   - ウォレット情報が存在する場合：WalletAlreadyExistsError

   ※ウォレット情報が存在しない場合、処理を継続する。

6. 共通処理「Waltidウォレット作成」を実施し、ウォレット、KeyおよびDIDを作成する。

   【取得情報】
   - `walletId`：作成したWaltidウォレットID
   - `keyId`：生成したKeyのID
   - `did`：作成したDID

7. 個人ウォレットテーブル（`priv_wallets`）に以下の情報を登録する。

   【登録情報】
   - `user_id`：3で取得したユーザーID
   - `waltid_wallet`：6で作成したWaltidウォレットID

8. ウォレットエイリアス情報テーブル（`wallet_aliases`）に以下の情報を登録する。

   【登録情報】
   - `waltid_wallet_id`：6で作成したWaltidウォレットID
   - `wallet_name`：
     - 個人ユーザーの場合：`Wallet of ${kcUser.name}`
     - 組織ユーザーの場合：`Wallet of ${groupId}`

   ※`created_on`にはデフォルト値（CURRENT_TIMESTAMP）を使用する。

9. DIDエイリアス情報テーブル（`did_aliases`）に以下の情報を登録する。

   【登録情報】
   - `waltid_wallet_id`：6で作成したWaltidウォレットID
   - `did`：6で作成したDID
   - `alias`：Initial_DID
   - `key_id`：6で生成したKeyのID

   ※`created_on`にはデフォルト値（CURRENT_TIMESTAMP）を使用する。

10. DBトランザクションをコミットする。

11. 成功レスポンスを返却する。

※DBトランザクション内でエラーが発生した場合、DBトランザクションをロールバックする。

※作成済みのWaltidウォレットが存在する場合、Waltid Wallet APIのウォレット削除を呼び出し、当該ウォレットを削除する。

※処理中に上記記載以外のエラーが発生した場合、InternalServerErrorを返却する。
