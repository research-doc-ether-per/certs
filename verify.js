①～③について確認しました。

① vct#integrity が存在しない場合：claim is missing
② VCT Metadata が公開されていない場合（HTTP 404）：hash mismatch
③ ハッシュ値が一致しない場合：hash mismatch
※②については、HTTP 404 のレスポンス内容がハッシュ計算に使用され、hash mismatch になっていると考えられます。そのため、現状の検証結果では①は判別できますが、②と③は区別できません。

また、walt.id v1.0.0 の VctIntegrityPolicy.kt では、以下のエラーが定義されています。

walt.id v1.0.0 の VctIntegrityPolicy.kt では、以下の5種類のエラーが定義されています。
① MISSING
- エラーメッセージ：vct#integrity claim is missing
- 内容：vct#integrity が存在しない場合
② MALFORMED
- エラーメッセージ：vct#integrity is not a string primitive または does not start with a supported prefix
- 内容：vct#integrity の値の型または形式が不正な場合
③ MISSING_VCT
- エラーメッセージ：Cannot verify vct#integrity: vct claim is missing
- 内容：vct が存在しない場合
④ FETCH_FAILED
- エラーメッセージ：Failed to fetch Type Metadata from vct URL
- 内容：VCT Metadata の取得に失敗した場合
⑤ VALUE_MISMATCH
- エラーメッセージ：vct#integrity hash mismatch for vct=...: stored=..., computed=...
- 内容：vct#integrity と取得した VCT Metadata のハッシュ値が一致しない場合


参考：https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-verification-policies2/src/commonMain/kotlin/id/walt/policies2/vc/policies/VctIntegrityPolicy.kt
