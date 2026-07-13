
`usePresentationRequest` では、`did` が未指定の場合、デフォルト DID を使用して VP に署名するようです。
ExchangeController.kt: https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-services/waltid-wallet-api/src/main/kotlin/id/walt/webwallet/web/controllers/exchange/ExchangeController.kt#L111-L113

また、`HolderBindingPolicy` の DID バインディング確認では、VC JWT Payload のルート階層にある `sub` フィールドを比較しています。
そのため、JSON 内部の `credentialSubject.id` が存在しない場合でも、このポリシーの検証には影響しない認識です。
