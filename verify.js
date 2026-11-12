**処理名：ウォレット削除**

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

4. DBトランザクションを開始する。

5. VCウォレットテーブル（`vc_wallets`）から削除対象ユーザーが保有する証明書情報を削除する。

   ■条件
   - 所有者ユーザーID：3で取得したユーザーID

   ※削除対象データが存在しない場合も処理を継続する。

6. 個人ウォレットテーブル（`priv_wallets`）から削除対象ユーザーのウォレット情報を取得し、削除する。

   ■条件
   - `user_id`：3で取得したユーザーID

   取得したWaltidウォレットIDを後続処理で使用する。

   ※削除対象データが存在しない場合も処理を継続する。

7. ウォレットエイリアス情報テーブル（`wallet_aliases`）から対象ウォレットの情報を削除する。

   ■条件
   - `waltid_wallet_id`：取得したWaltidウォレットID

   ※削除対象データが存在しない場合も処理を継続する。

8. DIDエイリアス情報テーブル（`did_aliases`）から対象ウォレットのDID情報を削除する。

   ■条件
   - `waltid_wallet_id`：取得したWaltidウォレットID

   ※削除対象データが存在しない場合も処理を継続する。

9. 共通処理「Waltidウォレット削除」を実施する。

10. 環境変数のSmartLiTA退会設定を確認する。

    SmartLiTA退会設定がtrueの場合、SmartLiTAの「利用者情報削除API」を呼び出し、SmartLiTAから退会を実施する。

    エンドポイント：`/UserMngRP/sp/api/v1/users/{userId}`  
    メソッド：DELETE

    パラメータ：
    - `userId`：利用者情報を削除するユーザーのID

    ※204が成功レスポンス。

    以下の場合エラーを返却する。
    - SmartLiTAから基本4情報を取得できなかった場合：SmartLiTAからのHTTPステータスコードを返却する。
    - 400：DeleteUserSmartLiTARequestError
    - 401：DeleteUserSmartLiTAAuthenticationError
    - 403：DeleteUserSmartLiTAForbiddenError
    - 404：DeleteUserSmartLiTANotFoundError
    - 500：DeleteUserSmartLiTAInternalServerError
    - 上記以外：InternalServerError

11. DBトランザクションをコミットする。

12. 成功レスポンスを返却する。

※処理中にエラーが発生した場合、DBトランザクションをロールバックする。

※処理中に上記記載以外のエラーが発生した場合、InternalServerErrorを返却する。
