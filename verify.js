v0.21.0 のホルダーウォレットでは、ホルダーDIDが異なる証明書の組み合わせ提示はサポートされていません。

原因として、ウォレット側（SSIKit2WalletService）の処理で、選択されたすべての証明書のホルダー公開鍵（Holder Binding）が完全に一致していることを必須条件としているためです。
https://github.com/walt-id/waltid-identity/blob/d53d92cf3434925c8a2af103bf2590ddb0f7bf2f/waltid-services/waltid-wallet-api/src/main/kotlin/id/walt/webwallet/service/SSIKit2WalletService.kt#L1216
