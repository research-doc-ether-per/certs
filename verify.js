**list**
指定されたユーザに関する、Verifier が発行した Presentation Request URL または提示可能な証明書の一覧
指定されたユーザに関する、Verifier が発行した Presentation Request URL または提示可能な証明書の一覧が指定される。

一覧は作成日時の降順でソートされる。

対象の Presentation Request URL または提示可能な証明書が存在しない場合、空配列が指定される。

**id**
提示可能証明書ID
Verifier が発行した Presentation Request URL または提示可能な証明書に対して、内部で割り当てられた ID が指定される。

**verifiersSiteUrl**
VerifierサイトのURL
VerifierサイトのURLが指定される。

**groupId**
グループID
Verifier が所属するグループIDが指定される。

**presentationRequestUrl**
Presentation Request URL
Verifier が発行した Presentation Request URL が指定される。

**type**
証明書種別
Presentation Request URL または提示可能な証明書の種別が指定される。

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

**name**
検証者名
Presentation Request を発行した Verifier の表示名が指定される。

Cloud Wallet に対象 Verifier の名前が設定されていない場合、null が指定される。

**updateDate**
更新日時（unixエポック秒）
対象データの最終更新日時が指定される。

**createDate**
作成日時（unixエポック秒）
対象データの作成日時が指定される。
