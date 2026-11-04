①～③について確認しました。

① vct#integrity が存在しない場合：claim is missing
② VCT Metadata が公開されていない場合（HTTP 404）：hash mismatch
③ ハッシュ値が一致しない場合：hash mismatch
※②については、HTTP 404 のレスポンス内容がハッシュ計算に使用され、hash mismatch になっていると考えられます。そのため、現状の検証結果では①は判別できますが、②と③は区別できません。

また、walt.id v1.0.0 の VctIntegrityPolicy.kt では、以下のエラーが定義されています。

| Reason | エラーメッセージ | 内容 |
|---|---|---|
| MISSING | vct#integrity claim is missing | vct#integrity が存在しない |
| MALFORMED | vct#integrity is not a string primitive / does not start with a supported prefix | 値の型または形式が不正 |
| MISSING_VCT | Cannot verify vct#integrity: vct claim is missing | vct が存在しない |
| FETCH_FAILED | Failed to fetch Type Metadata from vct URL | Metadata の取得に失敗 |
| VALUE_MISMATCH | vct#integrity hash mismatch for vct=...: stored=..., computed=... | ハッシュ値が不一致 |

参考：https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-verification-policies2/src/commonMain/kotlin/id/walt/policies2/vc/policies/VctIntegrityPolicy.kt
