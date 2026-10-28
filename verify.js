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
