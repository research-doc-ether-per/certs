"パラメータチェック

パラメータの必須チェックを実施する。

以下の場合、エラーを返却する。

・必須情報が存在しない場合：RequireParamsNotFoundError"
"パラメータ取得

パラメータから以下の情報を取得する。

・グループID
・証明書種別
・証明書フォーマット"
"証明書フィールド定義情報取得

以下の条件で証明書フィールド定義テーブルから証明書フィールド定義情報を取得する。

■条件（AND条件）
・グループID：パラメータのグループIDと一致
・証明書種別：パラメータの証明書種別と一致
・証明書フォーマット：パラメータの証明書フォーマットと一致

■取得情報
・証明書フィールド定義
・認証方式

該当レコードが存在しない場合、グループIDを「all」に変更して再取得する。"
"Credential Profile情報取得

証明書種別および証明書フォーマットが指定された場合、Credential Profile一覧を取得する。

エンドポイント：/issuer2/profiles
メソッド：GET
クエリパラメータ：なし

証明書種別と証明書フォーマットからCredential Configuration IDを生成する。

・証明書フォーマットが「vc+sd-jwt」の場合、「dc+sd-jwt」に変換する。
・Credential Configuration ID：証明書種別 +「_」+ 証明書フォーマット

取得したCredential Profile一覧から、Credential Configuration IDが一致するCredential Profileを取得する。

■取得情報
・credentialData
・selectiveDisclosure"
"証明書フィールド定義生成

Credential ProfileのcredentialDataから証明書フィールド定義を生成する。

■取得対象
・credentialSubject直下の項目（idを除く）
・credentialData直下の項目（@context、id、issuer、type、credentialSubjectを除く）

■設定情報
・key：項目名
・type：項目名および値から判定したフィールドタイプ
・required：false
・isDisclosure：selectiveDisclosureでsdがtrueの場合はtrue、それ以外はfalse
・hasDefaultValue：デフォルト値が存在する場合はtrue、それ以外はfalse

■フィールドタイプ判定
・image：image
・issuanceDate、expirationDate、issuedAt、validFrom、validUntil：datetime
・数値：number
・真偽値：boolean
・配列：array
・オブジェクト：object
・上記以外：text

■デフォルト値判定
以下の場合、hasDefaultValueにfalseを設定する。

・null
・undefined
・空文字列
・「string」
・「null」
・「THIS WILL BE REPLACED WITH DYNAMIC DATA FUNCTION」

上記以外の場合、trueを設定する。"
"証明書フィールド定義統合

Credential Profileから生成した証明書フィールド定義と、証明書フィールド定義テーブルから取得した情報を統合する。

■統合条件
・keyが一致する場合、DBの定義を優先する。
・Credential Profileのみに存在する項目は、そのまま追加する。
・DBのみに存在する項目は、そのまま追加する。"
"証明書画像データ取得

Credential ProfileのcredentialData.credentialSubject.imageを取得する。

・デフォルト値が存在する場合、証明書画像データにnullを設定する。
・デフォルト値が存在しない場合、デフォルト画像データを取得する。
・デフォルト画像データも存在しない場合、nullを設定する。"
"認証方式設定

証明書フィールド定義テーブルから取得した認証方式に応じて、以下の値を設定する。

・認証方式が「all」の場合：「pre_authorized」、「pwd」
・認証方式が「pre_authorized」の場合：「pre_authorized」
・認証方式が「pwd」の場合：「pwd」
・認証方式が取得できない場合：空配列"
"レスポンス返却

以下の情報を返却値として設定し、成功レスポンスを返却する。

・fields：統合後の証明書フィールド定義
・image：証明書画像データ
・authTypes：認証方式"
"※処理中に上記以外のエラーが発生した場合、InternalServerErrorを返却する。"
