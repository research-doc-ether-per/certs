presentation：プレゼンテーション全体の検証結果。提示されたVP（Verifiable Presentation）の検証結果をまとめた情報。

presentation.signature：プレゼンテーション署名検証結果（JWT）。VPの署名が正当であるかを示す。

presentation.presentation-definition：プレゼンテーション定義検証結果。Presentation Definitionの要件を満たしているかを示す。

presentation.signature_sd_jwt_vc：プレゼンテーション署名検証結果（SD-JWT）。SD-JWT形式のVPに対する署名検証結果。

credentials：証明書ごとの検証結果一覧。提示された各Credentialの検証結果を保持する。

credentials.{credentialId}：指定された証明書IDに対応する検証結果。

credentials.{credentialId}.expired：有効期限切れ検証結果。証明書が期限切れでないかを示す。

credentials.{credentialId}.notBefore：有効開始日時検証結果。証明書が有効期間内にあるかを示す。

credentials.{credentialId}.revoked_status_list：失効状態検証結果。証明書が失効されていないかを示す。

credentials.{credentialId}.signature：証明書署名検証結果。Credentialの署名が正当であるかを示す。
