issuer-api で Credential Offer を発行する際、sub に Issuer DID を指定した場合でも、発行後の VC を解析すると、構造は以下のようになります。

json
{
  "iss": "Credential Offer 発行時に指定した Issuer DID",
  "sub": "VC 取得時に、Holder が生成した PoP JWT のヘッダーから取得した Holder DID",
  "vc": "Credential Offer 発行時に指定した mapping および credentialData の内容",
  "jti": "VC ID",
  "iat": "発行日時",
  "nbf": "この時刻より前は無効（not before）"
}


Holder Binding の検証では、VC 取得時に Holder が生成した PoP JWT のヘッダーから取得された Holder DID が主に参照されます。
そのため、Credential Offer 発行時に指定した sub の値や、credentialData.credentialSubject の有無・内容によって、Holder Binding の検証結果が変わることはない認識です。

VC 生成処理の該当箇所は以下です。
OpenID4VCI.kt: https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-libraries/protocols/waltid-openid4vc/src/commonMain/kotlin/id/walt/oid4vc/OpenID4VCI.kt#L763
Issuer.kt: https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-libraries/credentials/waltid-w3c-credentials/src/commonMain/kotlin/id/walt/w3c/issuance/Issuer.kt#L59
W3CVC.kt: https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-libraries/credentials/waltid-w3c-credentials/src/commonMain/kotlin/id/walt/w3c/vc/vcs/W3CVC.kt#L95

