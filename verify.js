
発行した結果は、以下のファイルに出力されます。出力結果に含まれる各項目の意味は以下のとおりです。
  - `../output/pre-authorized-credential-result.json`

| 項目 | 説明 |
|---|---|
| `profileId` | Credential 発行時に使用した Credential Profile の ID です。 |
| `offer` | Issuer2 で作成された Credential Offer の情報です。`offerId`、`profileId`、`authMethod`、`credentialOffer` などが含まれます。 |
| `offerDetail` | Wallet2 で Credential Offer を解析した結果です。Credential Issuer、Credential Configuration ID、Grant Type、Credential Endpoint などの情報が含まれます。 |
| `credentialIds` | Credential の取得後、Wallet2 に保存された Credential の ID です。 |
| `credentials` | `credentialIds` を利用して Wallet2 から取得した Credential の詳細情報です。実際に発行された Credential の内容を確認できます。 |
