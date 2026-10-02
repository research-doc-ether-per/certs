

### 9.2.5 標準 Policy だけでは対応できない条件

標準 Policy だけでは対応できない業務条件については、
`webhook` または Custom Kotlin Policy で対応します。

| 要件例 | 対応方法 |
|---|---|
| 日付・期間に関する条件（例：`to - from >= 3年`、`issuedAt` が現在から N 年以内） | `webhook` / Custom Kotlin Policy |
| Credential 間の値比較（例：Credential A と B の subject ID が同一） | `webhook` / Custom Kotlin Policy |
| 金額・年齢などの数値条件 | `webhook` / Custom Kotlin Policy |
| DB の在籍状態・権限・ブラックリスト確認 | `webhook` |
| その他の独自業務ルール | `webhook` / Custom Kotlin Policy |
