※ Credential Offer 作成直後は、
`issuer2_issuance_sessions` や `issuer2_pre_authorized_codes` などの
一時データが Redis / Valkey に保存されることを確認できます。

これらのデータは後続処理で使用・削除されるため、
フロー完了後には Key が残っていない場合があります。
