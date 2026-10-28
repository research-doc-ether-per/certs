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

■検索条件（AND条件）
・グループID：パラメータのグループIDと一致
・証明書種別：パラメータの証明書種別と一致
・証明書フォーマット：パラメータの証明書フォーマットと一致

■取得情報
・証明書フィールド定義（fields）
・認証方式（auth_type）

グループIDが「all」以外の場合、指定されたグループIDで検索する。

該当レコードが存在しない場合、グループIDを「all」に変更して再取得する。"
"Credential Profile情報取得

証明書種別および証明書フォーマットが指定された場合、Credential Profile一覧を取得する。

エンドポイント：/issuer2/profiles
メソッド：GET
クエリパラメータ：なし

証明書種別および証明書フォーマットからCredential Configuration IDを生成する。

・証明書フォーマットが「vc+sd-jwt」の場合、「dc+sd-jwt」に変換する。
・Credential Configuration ID：証明書種別 +「_」+ 変換後の証明書フォーマット

取得したCredential Profile一覧から、Credential Configuration IDが一致するCredential Profileを取得する。

■取得情報
・credentialData
・selectiveDisclosure"
"証明書フィールド定義生成

Credential ProfileのcredentialDataとDBの証明書フィールド定義から、証明書フィールド定義を生成する。

■取得対象
・credentialSubject内の項目（idを除く）
・credentialData直下の項目（@context、id、issuer、typeを除く）
・DBのみに存在する項目

■フィールド構造
・fields：Array<object>
・各項目のkey：項目名
・ネストされた項目：typeを「object」とし、子項目をfields（Array<object>）に設定する。

■設定情報
・key：項目名
・type：DBの定義を優先し、未定義の場合はProfileの値から判定する。
・required：DBの定義を優先し、未定義の場合はfalseを設定する。
・hasDefaultValue：Profileのデフォルト値の有無を設定する。
・showInDetail：DBの定義を優先し、未定義の場合はtrueを設定する。
・showInIssue：DBの定義を優先し、未定義の場合はtrueを設定する。

■フィールドタイプ判定
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
"Selective Disclosure情報設定

Credential ProfileのselectiveDisclosureから、各項目の開示設定を取得する。

・sdがtrueの場合、isDisclosureにtrueを設定する。
・DBのisDisclosureがtrueの場合、DBの定義を優先する。
・isDisclosureがtrue以外の場合、返却項目に含めない。"
"証明書フィールド定義統合

Credential Profileから生成した証明書フィールド定義と、DBから取得した証明書フィールド定義を統合する。

■統合条件
・同一階層のkeyが一致する場合、DBの定義を優先する。
・Credential Profileのみに存在する項目を追加する。
・DBのみに存在する項目を追加する。
・ネストされた項目は階層構造を保持して統合する。

■DB定義から取得する情報
・type
・required
・length
・format
・issueFormat
・showInDetail
・showInIssue
・isDisclosure

統合後の証明書フィールド定義をArray<object>形式に変換する。

証明書種別または証明書フォーマットが指定されていない場合、DBの証明書フィールド定義をArray<object>形式に変換する。"
"証明書画像データ取得

Credential ProfileのcredentialData.credentialSubject.imageを取得する。

・画像データが存在する場合、取得した画像データを設定する。
・画像データが存在しない場合、デフォルト画像データを設定する。
・デフォルト画像データも存在しない場合、nullを設定する。"
"認証方式設定

証明書フィールド定義テーブルから取得した認証方式を変換し、認証方式一覧を生成する。

■設定情報
・authTypes：認証方式一覧（Array<string>）"
"レスポンス返却

以下の情報を返却値として設定し、成功レスポンスを返却する。

・fields：統合後の証明書フィールド定義（Array<object>）
・image：証明書画像データ（stringまたはnull）
・authTypes：認証方式一覧（Array<string>）"
"※処理中に上記以外のエラーが発生した場合、InternalServerErrorを返却する。"








プロパティ,説明,型,必須
fields,証明書フィールド定義の一覧が指定される。,Array<object>,○
,key,フィールドの項目名が指定される。,string,○
,type,フィールドのタイプが指定される。,string,○
,required,フィールドの必須有無が指定される。,boolean,△
,hasDefaultValue,デフォルト値の有無が指定される。,boolean,△
,showInDetail,証明書詳細画面での表示有無が指定される。,boolean,△
,showInIssue,証明書発行画面での表示有無が指定される。,boolean,△
,isDisclosure,選択的開示の対象である場合、trueが指定される。,boolean,△
,length,入力文字数の制限が指定される。,object,△
,,min,最小文字数が指定される。,number,△
,,max,最大文字数が指定される。,number,△
,format,フィールドのデータ形式が指定される。,string,△
,issueFormat,証明書発行時の入力形式が指定される。,string,△
,fields,ネストされたフィールド定義の一覧が指定される。,Array<object>,△
image,証明書画像データが指定される。,string / null,○
authTypes,認証方式の一覧が指定される。,Array<string>,○




