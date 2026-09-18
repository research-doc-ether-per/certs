# 4. Issuer2 の動作確認

Issuer2 v1.0.0 の Issuer DID 作成、`did:web` の公開、および OpenID4VCI による Credential 発行について、一連の動作確認を行うため、以下のツールを作成しました。

| ファイル名                                                       | 説明                                                                                                                                                                                             |
|------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `wallet2-issuer-did-create.js`                                   | Wallet2 を利用して Issuer 用の Wallet と secp256r1 Key を作成し、`did:web` を生成します。生成した Key / DID を Default Key / Default DID に設定し、DID Document を `did.json` として出力します。 |
| `docker-compose-did-web-add.js`                                  | `docker-compose.yaml` に `did-web-server` を追加し、生成した Issuer DID Document を nginx で公開するための設定を行います。                                                                       |
| `openid4vci-pre-authorized-credential-issue.js`                  | 事前認可コードフローについて、Wallet2 の一括処理 API を利用して Credential の取得・保存を確認します。                                                                                            |
| `openid4vci-pre-authorized-step-by-step-credential-issue.js`     | 事前認可コードフローについて、Token 取得、Nonce 取得、Proof 生成、Credential 取得を個別 API に分けて確認します。                                                                                 |
| `openid4vci-authorization-code-credential-issue.js`              | 認可コードフローについて、ブラウザ認証後の Credential 取得・保存を Wallet2 の一括処理 API を利用して確認します。                                                                                 |
| `openid4vci-authorization-code-step-by-step-credential-issue.js` | 認可コードフローについて、Authorization Code の交換、Nonce 取得、Proof 生成、Credential 取得を個別 API に分けて確認します。                                                                      |

## 4.1 利用手順

### 4.1.1 Issuer DID の作成

``` bash
# Issuer 用の Wallet、secp256r1 Key および did:web を作成
node wallet2-issuer-did-create.js

# 生成した DID Document を nginx で公開
# 実行後、walt.id を再起動する
node docker-compose-did-web-add.js
```

### 4.1.2 Credential 発行

Credential 発行前に、以下の設定を行います。

- `credential-issuer-metadata.conf`
  - 発行対象となる Credential Configuration を定義します。
- `issuer2-profiles.conf`
  - Credential Profile を定義し、`credentialConfigurationId`、`issuerKey`、`issuerDid`、`credentialData`、`mapping`、`selectiveDisclosure` などの発行設定を指定します。

今回の動作確認では、以下の Credential を発行対象とします。なお、VC Status 機能は対象外とします。

| Credential           | Format      | 確認内容                                                                                         |
|----------------------|-------------|--------------------------------------------------------------------------------------------------|
| `Awards_jwt_vc_json` | JWT VC JSON | JWT VC 形式の Credential 発行、取得、Wallet への保存を確認します。                               |
| `Awards`             | SD-JWT VC   | SD-JWT 形式の Credential 発行、`selectiveDisclosure` の適用、取得、Wallet への保存を確認します。 |

Credential 発行は、事前認可コードフローと認可コードフローについて、それぞれ以下の2方式を確認します。

- **一括処理 API**：Credential 取得に必要な複数の処理を Wallet2 内部でまとめて実行します。
- **個別処理 API（Step-by-Step）**：各処理を個別 API に分けて実行します。

#### 4.1.2.1 事前認可コードフロー（一括処理 API）

以下の流れで Credential を発行します。

1.  Credential Profile を取得・確認します。  
    `GET /issuer2/profiles/{profileId}`

2.  Credential Offer を作成します。  
    `POST /issuer2/credential-offers`

    必要に応じて `runtimeOverrides` により `credentialData`、`selectiveDisclosure`、`issuerDid`、`issuerKey`、`mapping`、`x5Chain` などを発行処理ごとに指定します。

3.  Credential Offer を解析します。  
    `POST /wallet/{walletId}/credentials/receive/resolve-offer`

4.  Credential を取得し、Wallet2 に保存します。  
    `POST /wallet/{walletId}/credentials/receive`

5.  保存された Credential の詳細を確認します。  
    `GET /wallet/{walletId}/credentials/{credentialId}`

``` bash
node openid4vci-pre-authorized-credential-issue.js
```

発行結果は以下のファイルに出力されます。

- `../output/pre-authorized-credential-result.json`

#### 4.1.2.2 事前認可コードフロー（個別処理 API / Step-by-Step）

以下の流れで Credential を発行します。

1.  Credential Profile を取得・確認します。  
    `GET /issuer2/profiles/{profileId}`

2.  Credential Offer を作成します。  
    `POST /issuer2/credential-offers`

3.  Credential Offer を解析します。  
    `POST /wallet/{walletId}/credentials/receive/resolve-offer`

4.  Pre-Authorized Code を Access Token に交換します。  
    `POST /wallet/{walletId}/credentials/receive/request-token`

5.  Credential Proof 用の Nonce を取得します。  
    `POST /wallet/{walletId}/credentials/receive/request-nonce`

6.  Holder Key / Holder DID を使用して Credential Proof を生成します。  
    `POST /wallet/{walletId}/credentials/receive/sign-proof`

7.  Credential を取得し、Wallet2 に保存します。  
    `POST /wallet/{walletId}/credentials/receive/fetch-credential`

``` bash
node openid4vci-pre-authorized-step-by-step-credential-issue.js
```

Holder DID は `credentialSubject.id` として設定するのではなく、Credential Proof 生成時の Holder Binding に使用します。

#### 4.1.2.3 認可コードフロー（一括処理 API）

認可コードフローではブラウザ認証が必要となるため、Credential Offer の作成・解析と Credential の発行を分けて実行します。

##### Credential Offer の作成・解析

``` bash
node openid4vci-authorization-code-credential-issue.js getOfferDetails
```

1.  Credential Profile を取得・確認します。  
    `GET /issuer2/profiles/{profileId}`

2.  Credential Offer を作成します。  
    `POST /issuer2/credential-offers`

3.  Credential Offer を解析します。  
    `POST /wallet/{walletId}/credentials/receive/resolve-offer`

4.  Authorization URL を生成します。  
    `POST /wallet/{walletId}/credentials/receive/authorization-url`

5.  Authorization URL をブラウザで開き、Keycloak で認証します。

6.  Redirect URL から `code` および `state` を取得します。

##### Credential の発行

``` bash
node openid4vci-authorization-code-credential-issue.js requestVC
```

1.  保存した Credential Offer / Authorization 情報を読み込みます。

2.  Redirect URL から取得した `state` を確認します。

3.  Authorization Code を使用して Credential を取得し、Wallet2 に保存します。  
    `POST /wallet/{walletId}/credentials/receive/authorized`

4.  保存された Credential の詳細を確認します。  
    `GET /wallet/{walletId}/credentials/{credentialId}`

#### 4.1.2.4 認可コードフロー（個別処理 API / Step-by-Step）

認可コードフローではブラウザ認証が必要となるため、Credential Offer の作成・解析と Credential の発行を分けて実行します。

##### Credential Offer の作成・解析

``` bash
node openid4vci-authorization-code-step-by-step-credential-issue.js getOfferDetails
```

1.  Credential Profile を取得・確認します。  
    `GET /issuer2/profiles/{profileId}`

2.  Credential Offer を作成します。  
    `POST /issuer2/credential-offers`

3.  Credential Offer を解析します。  
    `POST /wallet/{walletId}/credentials/receive/resolve-offer`

4.  Authorization URL を生成します。  
    `POST /wallet/{walletId}/credentials/receive/authorization-url`

5.  後続処理に必要な `state`、`codeVerifier`、Credential Issuer などの情報を保存します。

6.  Authorization URL をブラウザで開き、Keycloak で認証します。

7.  Redirect URL から `code` および `state` を取得します。

##### Credential の発行

``` bash
node openid4vci-authorization-code-step-by-step-credential-issue.js requestVC
```

1.  保存した Credential Offer / Authorization 情報を読み込みます。

2.  Redirect URL から取得した `state` を確認します。

3.  Authorization Code を Access Token に交換します。  
    `POST /wallet/{walletId}/credentials/receive/exchange-code`

4.  Credential Proof 用の Nonce を取得します。  
    `POST /wallet/{walletId}/credentials/receive/request-nonce`

5.  Holder Key / Holder DID を使用して Credential Proof を生成します。  
    `POST /wallet/{walletId}/credentials/receive/sign-proof`

6.  Credential を取得し、Wallet2 に保存します。  
    `POST /wallet/{walletId}/credentials/receive/fetch-credential`

## 4.1.3 Credential 発行 Flow / API 一覧

4つの発行方法の違いを以下に示します。

### 4.1.3.1 個別処理 API（Step-by-Step）の Flow

| 処理                          | Pre-Authorized                      | Authorization Code                  |
|-------------------------------|-------------------------------------|-------------------------------------|
| Credential Profile 取得・確認 | `GET /issuer2/profiles/{profileId}` | `GET /issuer2/profiles/{profileId}` |
| ↓                             | ↓                                   | ↓                                   |
| Credential Offer 作成         | `POST /issuer2/credential-offers`   | `POST /issuer2/credential-offers`   |
| ↓                             | ↓                                   | ↓                                   |
| Credential Offer 解析         | `POST .../resolve-offer`            | `POST .../resolve-offer`            |
| ↓                             | ↓                                   | ↓                                   |
| Authorization URL 生成        | ―                                   | `POST .../authorization-url`        |
| ↓                             | ↓                                   | ↓                                   |
| User 認証                     | ―                                   | Browser / Keycloak                  |
| ↓                             | ↓                                   | ↓                                   |
| Authorization Code 取得       | ―                                   | Redirect URL                        |
| ↓                             | ↓                                   | ↓                                   |
| Access Token 取得             | `POST .../request-token`            | `POST .../exchange-code`            |
| ↓                             | ↓                                   | ↓                                   |
| Nonce 取得                    | `POST .../request-nonce`            | `POST .../request-nonce`            |
| ↓                             | ↓                                   | ↓                                   |
| Credential Proof 生成         | `POST .../sign-proof`               | `POST .../sign-proof`               |
| ↓                             | ↓                                   | ↓                                   |
| Credential 取得・保存         | `POST .../fetch-credential`         | `POST .../fetch-credential`         |

※ 表中の `...` は `/wallet/{walletId}/credentials/receive` を表します。

Access Token 取得までの処理は認可方式によって異なりますが、Access Token 取得後の `request-nonce`、`sign-proof`、`fetch-credential` は両フローで共通です。

### 4.1.3.2 一括処理 API との比較

一括処理 API では、Step-by-Step 版で個別に実行する処理の一部を Wallet2 内部でまとめて実行します。

| Flow               | 一括処理 API                                             | Wallet2 内部で実行される主な処理                                         |
|--------------------|----------------------------------------------------------|--------------------------------------------------------------------------|
| Pre-Authorized     | `POST /wallet/{walletId}/credentials/receive`            | Access Token 取得、Nonce 取得、Proof 生成、Credential 取得・保存         |
| Authorization Code | `POST /wallet/{walletId}/credentials/receive/authorized` | Authorization Code の交換、Nonce 取得、Proof 生成、Credential 取得・保存 |

Credential Profile の取得、Credential Offer の作成・解析、および Authorization Code Flow の Authorization URL 生成・ブラウザ認証は、一括処理版でも別途実行します。

## 4.2 確認結果

### 4.2.1 Issuer DID / Key の指定

Issuer2 では、Credential Profile に設定された `issuerKey` / `issuerDid` を発行時のデフォルト値として利用できます。

また、Credential Offer 作成時に `runtimeOverrides.issuerKey` / `runtimeOverrides.issuerDid` を指定することで、発行処理ごとに使用する Issuer Key / Issuer DID を変更できます。

### 4.2.2 Credential 発行設定

Issuer2 v1.0.0 では、Credential Configuration と実際の発行設定が分離されています。

#### credential-issuer-metadata.conf

`credential-issuer-metadata.conf` では、Issuer2 がサポートする Credential Configuration を定義します。

Credential のフォーマット、Claims、Display 情報など、Credential Issuer Metadata として公開される Credential の種類・仕様を設定します。

つまり、「何を発行できるか」を定義する設定です。

#### issuer2-profiles.conf

`issuer2-profiles.conf` では、Credential を実際に発行するための Credential Profile を定義します。

主な設定項目は以下のとおりです。

- `credentialConfigurationId`
- `issuerKey`
- `issuerDid`
- `credentialData`
- `x5Chain`
- `mapping`
- `selectiveDisclosure`

`credentialConfigurationId` により、`credential-issuer-metadata.conf` で定義した Credential Configuration と Credential Profile を関連付けます。

``` text
Credential Configuration
「何を発行するか」
        ↓
Credential Profile
「どのような設定で発行するか」
        ↓
Credential Offer
「今回の発行処理」
```

Credential Offer 作成時には `runtimeOverrides` を指定することで、Credential Profile の設定を発行処理ごとに変更できます。

例えば、`runtimeOverrides.credentialData` で発行データ、`runtimeOverrides.selectiveDisclosure` で SD-JWT の選択的開示設定を変更できます。必要に応じて `issuerDid`、`issuerKey`、`mapping`、`x5Chain` なども指定できます。

### 4.2.3 一括処理 API / 個別処理 API

Wallet2 v1.0.0 では、Credential 取得に必要な一連の処理をまとめて実行する API と、各処理を個別に実行する API の両方を利用できます。

個別処理 API を利用することで、事前認可コードフローと認可コードフローでは Access Token の取得方法が異なり、その後の Nonce 取得、Credential Proof 生成、Credential 取得は共通の処理として利用できることを確認しました。

### 4.2.4 Authorization Code Flow の Callback URL について

v0.15.1 と v1.0.0 では、Callback 処理および Callback URL が以下のように変更されています。

| バージョン | Callback URL                                               | 対応                                                                                 |
|------------|------------------------------------------------------------|--------------------------------------------------------------------------------------|
| v0.15.1    | `http://10.0.2.15:7002/callback`                           | 正常に Callback 処理を行うため、walt.id のソースコードを一部修正する必要があります。 |
| v1.0.0     | `http://10.0.2.15:7005/openid4vci/external/oauth/callback` | walt.id のソースコードを修正する必要はありません。                                   |
