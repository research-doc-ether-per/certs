


以前、ID_TOKEN について調査するとおっしゃっていたと思いますが、調査対象について確認させてください。
AuthenticationMethod.ID_TOKEN と idTokenClaimsMapping のどちらを想定されていますでしょうか。

AuthenticationMethod.ID_TOKEN の場合、Issuer2 ではすでに使用されておらず、公式ドキュメント上でも Deprecated になっています。
参照: https://docs.walt.id/community-stack/issuer/credential-issuance/sd-jwt-vc-oid4vc
一方、idTokenClaimsMapping は、主に Authorization Code Flow + 外部 Authorization Server を利用する場合の機能です。
例えば Keycloak を利用する場合、
Wallet → Issuer2 → Keycloak でログイン → Authorization Code → Token / ID Token → Issuer2 → Credential 発行
という流れになります。

Keycloak で認証したユーザーの ID Token に、name や email などの情報が含まれている場合、idTokenClaimsMapping を利用して、それらの情報を Credential に反映できます。
例えば、
ID Token の name / email → idTokenClaimsMapping → Credential の name / email
というイメージです。
参照: https://docs.walt.id/community-stack/issuer2/configurations/config-files/issuer-profiles

つまり、認証したユーザーの情報を Credential に反映するための機能です。
今回はこちらの idTokenClaimsMapping について調査すればよいでしょうか。
