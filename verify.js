| Policy | 主な用途 | 標準搭載 | 今回確認 |
|---|---|---:|---:|
| `signature` | Credential の署名・改ざん検証 | ○ | ○ |
| `expiration` | 有効期限の検証 | ○ | ○ |
| `not-before` | 有効開始日時の検証 | ○ | ○ |
| `allowed-issuer` | 許可された issuer のみ受理 | ○ | ○ |
| `credential-status` | Credential Status の検証 | ○ | ○ |
| `revoked-status-list` | Status List による失効確認 | ○ | 未確認 ※1 |
| `regex` | claim の固定値・文字列形式の検証 | ○ | ○ |
| `schema` | `required` / `type` / `enum` / `pattern` 等の検証 | ○ | ○ |
| `vct-integrity` | SD-JWT VC の VCT Integrity を検証 | ○ | ○ ※2 |
| `vical` | VICAL に基づく検証（mdoc 関連の検証で使用） | ○ | 未確認 |
| `etsi-trust-list` | ETSI / eIDAS 等の Trust List に基づく検証 | ○ | 未確認 |
| `webhook` | 外部 HTTP endpoint に検証処理を委譲 | ○ | ○ ※3 |
| `date-within` | claim の日付が現在から指定期間内であることを検証 | カスタム | ○ ※4 |
※1 今回の失効確認では、W3C Bitstring Status List を使用する `credential-status` Policy の動作確認を実施したため、`revoked-status-list` は未確認です。

※2 `vct-integrity` Policy の動作確認用として、Custom VCT Metadata Server を作成しました。
   - 参照: `../v1.0.0_custom-vct-metadata-server/README.md`

※3 `webhook` Policy の動作確認用として、Custom Verification Webhook Server を作成しました。
   - 参照: `../v1.0.0_custom-webhook-server/README.md`
   - 以下の条件について動作確認を実施しました。
     - Career の `to - from >= 3年`
     - Awards の `issuedAt` が現在から N 年以内

※4 `date-within` は標準搭載 Policy ではなく、今回の検証用に Custom Kotlin Policy として追加しました。
   - 参照: `../`
   - 指定した claim の日付が、現在から指定した期間内であることを検証します。
