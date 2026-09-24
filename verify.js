
### 4.2.5 idTokenClaimsMapping について

`idTokenClaimsMapping` は、主に Authorization Code Flow で外部 Authorization Server を利用する場合に使用します。

例えば Keycloak を Authorization Server として利用する場合、以下のような流れで ID Token を取得し、ID Token の Claim を Credential Data にマッピングできます。

```txt
wallet-web
   │
   │ Authorization Code Flow
   ▼
Keycloak（Authorization Server）
   │
   │ ユーザー認証
   │
   ├── Authorization Code
   │
   ▼
Token Endpoint
   │
   ├── Access Token
   └── ID Token
          │
          ▼
    ID Token Claims
          │
          ▼
 idTokenClaimsMapping
          │
          ▼
   credentialData
```

Keycloak で認証したユーザーの ID Token に `sub` や `preferred_username` などの Claim が含まれている場合、`idTokenClaimsMapping` を利用して、それらの情報を Credential に反映できます。

例えば、Credential Offer 作成時に以下のように指定します。

```js
const offer = await issuer2Service.createCredentialOffer({
  profileId,
  authMethod: issuer2Service.AUTH_METHOD.AUTHORIZED,
  valueMode: 'BY_REFERENCE',

  credentialData: {
    credentialSubject: {
      userId: 'THIS WILL BE REPLACED WITH ID TOKEN CLAIM',
      userName: 'THIS WILL BE REPLACED WITH ID TOKEN CLAIM',
    },
  },

  idTokenClaimsMapping: {
    '$.sub': '$.credentialSubject.userId',
    '$.preferred_username': '$.credentialSubject.userName',
  },
})
```

上記の場合、ID Token の Claim は以下のように Credential Data にマッピングされます。

```txt
$.sub                 → $.credentialSubject.userId
$.preferred_username  → $.credentialSubject.userName
```

`idTokenClaimsMapping` の左側には ID Token の Claim の JSONPath、右側には Credential Data のマッピング先の JSONPath を指定します。

- サンプル参照：Authorization Code Flow
  - `openid4vci-authorization-code-credential-issue.js`
  - `openid4vci-authorization-code-step-by-step-credential-issue.js`
