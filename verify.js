
# walt.id v1.0.0 — VC IDの生成仕様

## 1. VC Import

既存のVCをWallet2にインポートする場合、VC Payload内の`id`は変更せず、Wallet2内部で管理する証明書IDを新規UUIDとして生成する。

**関連ソースコード**

- [Wallet2RouteHandler.kt（L365）](https://github.com/walt-id/waltid-identity/blob/33146017545499eb5f57335ba652be1cb0563c5c/waltid-libraries/protocols/waltid-openid4vc-wallet-server/src/main/kotlin/id/walt/wallet2/server/handlers/Wallet2RouteHandler.kt#L365)
- [WalletCredentialHandler.kt（L20）](https://github.com/walt-id/waltid-identity/blob/33146017545499eb5f57335ba652be1cb0563c5c/waltid-libraries/protocols/waltid-openid4vc-wallet/src/commonMain/kotlin/id/walt/wallet2/handlers/WalletCredentialHandler.kt#L20)

## 2. VC Issuance

Issuer2でVCを発行する場合、VC Payload内の`id`はCredential BuilderおよびMappingの設定によって決定される。

Mappingで`id`を指定しない場合、デフォルトで`urn:uuid:...`形式のIDが生成される。

Mappingで`id`を明示的に指定した場合、Mappingの処理結果がVC Payloadの`id`に反映される。

一方、Wallet2が発行済みVCを受信して保存する際には、Wallet2内部で管理する証明書IDを新規UUIDとして生成する。

**関連ソースコード**

- [WalletIssuanceHandler.kt（L1467）](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/protocols/waltid-openid4vc-wallet/src/commonMain/kotlin/id/walt/wallet2/handlers/WalletIssuanceHandler.kt#L1467)
- [CredentialBuilder.kt（L58）](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-libraries/credentials/waltid-w3c-credentials/src/commonMain/kotlin/id/walt/w3c/CredentialBuilder.kt#L58)

## 3. ID生成結果の比較

| 処理 | VC Payload内のid | Wallet2内部の証明書ID |
|---|---|---|
| VC発行（Mappingでid未指定） | デフォルトで`urn:uuid:...`を生成 | 新規UUIDを生成 |
| VC発行（Mappingでid指定） | Mappingの処理結果を反映 | 新規UUIDを生成 |
| VC Import | 元のVC Payload内のidを保持 | 新規UUIDを生成 |

## 4. 結論

walt.id v1.0.0では、VC発行およびVC Importのいずれの場合も、Wallet2内部の証明書IDはVC Payload内の`id`とは独立して新規生成される。

そのため、Wallet2内部の証明書IDとVC Payload内の`id`は別の識別子として管理する必要がある。
