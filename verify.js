
waltid-cli v1.0.0を確認したところ、DID作成は did:key と did:jwk のみ対応していて、did:web には対応していないです。

参照：
- [DidCreateCmd.kt#L56: `The native crypto2 DID method to use: key or jwk.`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-applications/waltid-cli/src/commonMain/kotlin/id/walt/cli/commands/DidCreateCmd.kt#L56)
- [waltid-cli README: `CLI creation advertises only the native crypto2 did:key and did:jwk registrars; former non-native method options were removed.`](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-applications/waltid-cli/README.md#dids)
  
waltid-didライブラリには did:web の作成処理（DidWebCreateOptions）が残っていますので。CLI側を修正すれば、did:web の作成にも対応できそうです。
参照：
- [DidWebCreateOptions.kt](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/waltid-did/src/commonMain/kotlin/id/walt/did/dids/registrar/dids/DidWebCreateOptions.kt)
- [waltid-did README（did:web作成例）](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/waltid-did/README.md)
