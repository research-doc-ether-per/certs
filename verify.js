**presentationRequest**
Presentation Request のURL
Verifier からの証明書提示要求にアクセスするためのURLを指定する。

**selectedCredentials**
提示対象となる証明書IDのリスト
Presentation Request の条件に基づき選択された証明書を指定する。

**disclosures**
提示対象証明書IDと disclosure 情報の対応関係
各証明書に対して開示するクレーム情報を指定する。

**groupId**
提示先 Verifier のグループID


**presentation**
プレゼンテーション全体の検証結果
提示された VP（Verifiable Presentation）の検証結果をまとめた情報が指定される。

**presentation.signature**
プレゼンテーション署名検証結果
VP の署名検証結果が指定される。

証明書のフォーマット種別が jwt_vc_json の場合、本項目が指定される。

**presentation.presentation-definition**
プレゼンテーション定義検証結果
Presentation Definition の要件を満たしているかどうかの検証結果が指定される。

証明書のフォーマット種別が vc+sd-jwt の場合、本項目が指定される。

**presentation.signature_sd-jwt-vc**
プレゼンテーション署名検証結果
SD-JWT 形式の VP に対する署名検証結果が指定される。

証明書のフォーマット種別が vc+sd-jwt の場合、本項目が指定される。

**credentials**
証明書検証結果リスト
提示された証明書ごとの検証結果が指定される。

**credentials.{提示対象証明書ID}**
指定された証明書IDに対応する検証結果
提示対象証明書IDごとの検証結果が指定される。

**credentials.{提示対象証明書ID}.expired**
有効期限切れ検証結果
証明書が期限切れでないかどうかの検証結果が指定される。

**credentials.{提示対象証明書ID}.notBefore**
有効期間開始日時検証結果
証明書が有効期間内にあるかどうかの検証結果が指定される。

**credentials.{提示対象証明書ID}.revoked-status-list**
失効状態検証結果
証明書が失効されていないかどうかの検証結果が指定される。

**credentials.{提示対象証明書ID}.signature**
証明書署名検証結果
Credential の署名検証結果が指定される。

証明書のフォーマット種別が jwt_vc_json の場合、本項目が指定される。
