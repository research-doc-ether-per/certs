
VC 内の Holder DID が DID1 の状態で、異なる DID（DID2）を使用して VP に署名し、Verifier に提示した場合について確認しました。

前提条件として、リクエストパラメータに holder-binding を追加しています。

また、credential-issuer-metadata.conf に Holder Binding Methods が指定されているため、証明書形式によって Holder Binding の方式が異なります。
JWT の場合は DID 形式の Holder Binding が使用されます（cryptographic_binding_methods_supported = ["did"]）。
SD-JWT の場合は JWK（JSON Web Key）形式の公開鍵による Holder Binding が使用されます（cryptographic_binding_methods_supported = ["jwk"]）。

ケース1：DID1 が存在する状態で、Holder DID1 で提示した場合
 - JWT の場合：holder-binding の検証結果は true となりました。
 - SD-JWT の場合：vp_token が VC の JWT 自体になるため、HolderBindingPolicy.kt 側の検証ロジックを修正し、VC 内の cnf が一致しているかを確認する処理を追加する必要があります。現状のままでは、holder-binding の検証結果は false となります。
HolderBindingPolicy.kt: https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-libraries/credentials/waltid-verification-policies/src/commonMain/kotlin/id/walt/policies/policies/vp/HolderBindingPolicy.kt#L33

ケース2：DID1 が存在する状態で、Holder DID2 で提示した場合
 - JWT の場合：holder-binding の検証結果は false となりました。
 - SD-JWT の場合：ケース1と同様。

ケース3：DID1 を削除した後に、Holder DID2 で提示した場合
 - VP 作成時に以下のエラーが発生します。
   - No key was resolved when trying to resolve key to sign JWS to generate presentation for vp_token

該当箇所は以下です。
https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-services/waltid-wallet-api/src/main/kotlin/id/walt/webwallet/service/oidc4vc/TestCredentialWallet.kt#L173
