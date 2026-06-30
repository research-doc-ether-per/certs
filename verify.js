**vp**
VP 情報
vp_token をデコードして取得した VP 情報が指定される。

**vp.verifiableCredential**
証明書本体データ一覧
証明書本体データ（JWT）などの情報を格納する配列が指定される。

**vp.verifiableCredential.issuerName**
発行者名
証明書を発行した Issuer の表示名が指定される。

Cloud Wallet に対象 Issuer の名前が設定されていない場合、null が指定される。

**vp.verifiableCredential.fields**
証明書表示項目情報
証明書内のクレームに対応する画面表示用の項目名、データ型、必須可否、入力制約および表示有無を定義する情報が指定される。

証明書の表示項目情報が存在しない場合、空配列が指定される。

**vp.verifiableCredential.value**
証明書本体データ（JWT）

**verifyResult**
VP 検証結果
提示された VP（Verifiable Presentation）の検証結果をまとめた情報が指定される。

**verifyResult.presentation**
プレゼンテーション全体の検証結果
提示された VP（Verifiable Presentation）の検証結果をまとめた情報が指定される。

**verifyResult.presentation.signature**
プレゼンテーション署名検証結果
VP の署名検証結果が指定される。

証明書のフォーマット種別が jwt_vc_json の場合、本項目が指定される。

**verifyResult.presentation.presentation-definition**
プレゼンテーション定義検証結果
Presentation Definition の要件を満たしているかどうかの検証結果が指定される。

証明書のフォーマット種別が vc+sd-jwt の場合、本項目が指定される。

**verifyResult.presentation.signature_sd-jwt-vc**
プレゼンテーション署名検証結果
SD-JWT 形式の VP に対する署名検証結果が指定される。

証明書のフォーマット種別が vc+sd-jwt の場合、本項目が指定される。

**verifyResult.credentials**
証明書検証結果リスト
提示された証明書ごとの検証結果が指定される。

**verifyResult.credentials.{提示対象証明書ID}**
指定された証明書IDに対応する検証結果
提示対象証明書IDごとの検証結果が指定される。

**verifyResult.credentials.{提示対象証明書ID}.expired**
有効期限切れ検証結果
証明書が期限切れでないかどうかの検証結果が指定される。

**verifyResult.credentials.{提示対象証明書ID}.notBefore**
有効期間開始日時検証結果
証明書が有効期間内にあるかどうかの検証結果が指定される。

**verifyResult.credentials.{提示対象証明書ID}.revoked-status-list**
失効状態検証結果
証明書が失効されていないかどうかの検証結果が指定される。

**verifyResult.credentials.{提示対象証明書ID}.signature**
証明書署名検証結果
Credential の署名検証結果が指定される。

証明書のフォーマット種別が jwt_vc_json の場合、本項目が指定される。
