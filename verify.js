**処理名：組織ウォレット一覧取得**

**処理内容**

1. 組織ウォレット管理API認証を実施する。

2. アクセストークンから組織ウォレットIDの一覧を取得する。

3. 【取得した組織ウォレットIDごとに繰り返し・・・ここから】

   組織ウォレットIDをキーに個人ウォレットテーブル（`priv_wallets`）を検索し、既にウォレット情報が存在するか確認する。

   ■条件
   - `user_id`：アクセストークンのiss＋組織ウォレットID（accessToken.groups内のgroup名）

4. ウォレット情報が存在しない場合、共通処理「Waltidウォレット作成」を実施する。

5. 個人ウォレットテーブル（`priv_wallets`）およびウォレットエイリアス情報テーブル（`wallet_aliases`）から、対象ウォレットの情報を取得する。

   ■条件
   - `priv_wallets.user_id`：アクセストークンのiss＋組織ウォレットID
   - `wallet_aliases.waltid_wallet_id`：`priv_wallets.waltid_wallet`

   【取得情報】
   - `id`：WaltidウォレットID
   - `name`：ウォレット名
   - `created_on`：作成日時

6. Waltid Wallet API（wallet-api2）のDID一覧取得を呼び出し、対象ウォレットのDID情報を取得する。

   エンドポイント：`/wallet/{walletId}/dids`  
   メソッド：GET

   パラメータ：
   - `walletId`：5で取得したWaltidウォレットID

   ボディ：なし

   【取得情報】
   - `did`：DID一覧の先頭にあるDID

7. 取得した情報をレスポンス用のウォレット一覧に追加する。

   【設定情報】
   - `id`：WaltidウォレットID
   - `name`：ウォレット名
   - `created_on`：作成日時
   - `did`：6で取得したDID
   - `groupId`：組織ウォレットID

8. 【取得した組織ウォレットIDごとに繰り返し・・・ここまで】

9. 取得した情報を返却値として設定し、成功レスポンスを返却する。

   【レスポンス】
   - `walletList`：取得した組織ウォレット情報の一覧

※処理中に上記記載以外のエラーが発生した場合、InternalServerErrorを返却する。
