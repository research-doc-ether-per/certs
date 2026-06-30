**list**
Presentation Request URL および提示可能証明書情報の一覧
指定されたグループIDに対応する Verifier が発行した Presentation Request URL または提示可能な証明書情報の一覧が指定される。

**id**
提示可能証明書ID
指定されたグループIDに対応する Verifier が発行した Presentation Request URL または提示可能な証明書情報に対して、内部で割り当てられた ID が指定される。

**groupId**
グループID

**presentationRequestUrl**
Presentation Request URL
Verifier からの証明書提示要求にアクセスするためのURLが指定される。

**state**
ステータス
Presentation Request から取得した state 値が指定される。

**type**
証明書種別
Presentation Request URL または提示可能な証明書情報の種別が指定される。

例：
・Career：職歴
・Awards：表彰
・Qualifications：資格
・b4d：基本4情報

**format**
証明書フォーマット種別
証明書のフォーマット種別が指定される。

例：
・jwt_vc_json
・vc+sd-jwt

**targets**
提示可能な対象者のユーザ名リスト
対象者がウォレットにサインインする際、認証認可サーバで払い出されたアクセストークンの `preferred_username` と一致する文字列の一覧が指定される。

**name**
検証者名
Presentation Request を発行した Verifier の表示名が指定される。

**updateDate**
更新日時（unixエポック秒）
対象データの最終更新日時が指定される。

**createDate**
作成日時（unixエポック秒）
対象データの作成日時が指定される。
