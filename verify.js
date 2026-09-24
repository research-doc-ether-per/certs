
waltid-cli v1.0.0を確認したところ、DID作成は `did:key` と `did:jwk` のみ対応しており、`did:web` は対応していないようです。

参照：
- DidCreateCmd.kt
  https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-applications/waltid-cli/src/commonMain/kotlin/id/walt/cli/commands/DidCreateCmd.kt
  `The native crypto2 DID method to use: key or jwk.`

- waltid-cli README
  https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-applications/waltid-cli/README.md
  `CLI creation advertises only the native crypto2 did:key and did:jwk registrars; former non-native method options were removed.`
