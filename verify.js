# 4. Issuer2 の動作確認

Issuer2 v1.0.0 の Issuer DID 作成、`did:web` の公開、および OpenID4VCI による Credential 発行について、一連の動作確認を行うため、以下のツールを作成しました。

| ファイル名 | 説明 |
|---|---|
| `wallet2-issuer-did-create.js` | Wallet2 を利用して Issuer 用の Wallet と secp256r1 Key を作成し、`did:web` を生成します。生成した Key / DID を Default Key / Default DID に設定し、DID Document を `did.json` として出力します。 |
| `docker-compose-did-web-add.js` | `docker-compose.yaml` に `did-web-server` を追加し、生成した Issuer DID Document を nginx で公開するための設定を行います。 |
| `openid4vci-pre-authorized-credential-issue.js` | 事前認可コードフローで、Issuer2 の Credential Profile 確認、Credential Offer 作成、Wallet2 による Offer 解析、Credential の取得・保存までを確認します。JWT VC / SD-JWT VC を発行対象として確認します。 |
| `openid4vci-authorization-code-credential-issue.js` | 認可コードフローの動作確認用ツールです。 |

## 4.1 利用手順

### 4.1.1 Issuer DID の作成

```bash
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

#### 4.1.2.1 事前認可コードフロー

`openid4vci-pre-authorized-credential-issue.js` を使用し、事前認可コードフローによる Credential 発行を確認します。

今回の確認では、以下の Credential を発行対象とします。

| Credential | Format | 確認内容 |
|---|---|---|
| `Awards_jwt_vc_json` | JWT VC JSON | JWT VC 形式の Credential 発行、取得、Wallet への保存を確認します。 |
| `Awards` | SD-JWT VC | SD-JWT 形式の Credential 発行、`selectiveDisclosure` の適用、取得、Wallet への保存を確認します。 |

以下の流れで Credential を発行します。

1. 指定した `profileId` の Credential Profile が存在することを確認します。
2. Credential Profile を利用して Credential Offer を作成します。
   - 必要に応じて `runtimeOverrides` により `credentialData`、`selectiveDisclosure`、`issuerDid`、`issuerKey`、`mapping`、`x5Chain` などを発行処理ごとに指定します。
3. Wallet2 で Credential Offer を解析します。
4. Holder DID を指定して Credential を取得します。
5. Wallet2 に保存された Credential を確認します。
6. 取得した Credential の詳細を確認し、発行データおよび `selectiveDisclosure` の適用結果を確認します。

```bash
node openid4vci-pre-authorized-credential-issue.js
```

#### 4.1.2.2 認可コードフロー

認可コードフローについては、`openid4vci-authorization-code-credential-issue.js` を使用して確認します。

詳細は調査・実装後に追記します。

```bash
node openid4vci-authorization-code-credential-issue.js
```

## 4.2 確認結果

### 4.2.1 Issuer DID / Key の指定

Issuer2 では、Credential Profile に設定された `issuerKey` / `issuerDid` を発行時のデフォルト値として利用できます。

また、Credential Offer 作成時に `runtimeOverrides.issuerKey` / `runtimeOverrides.issuerDid` を指定することで、発行処理ごとに使用する Issuer Key / Issuer DID を変更できます。

### 4.2.2 Credential 発行設定

Issuer2 v1.0.0 では、Credential Configuration と実際の発行設定が分離されています。

#### credential-issuer-metadata.conf

`credential-issuer-metadata.conf` では、Issuer2 がサポートする Credential Configuration を定義します。

Credential Configuration には、Credential のフォーマット、Claims、Display 情報など、Credential Issuer Metadata として公開される Credential の種類・仕様を設定します。

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

関係は以下のとおりです。

```text
Credential Configuration
「何を発行するか」
        ↓
Credential Profile
「どのような設定で発行するか」
        ↓
Credential Offer
「今回の発行処理」
```

Credential Offer 作成時には `runtimeOverrides` を指定することで、Credential Profile の一部の設定を発行処理ごとに変更できます。

例えば、`runtimeOverrides.credentialData` を指定することで、Profile に定義された Credential Data の一部または全部を発行時のデータで上書きできます。

また、`runtimeOverrides.selectiveDisclosure` を指定することで、SD-JWT 発行時の選択的開示設定を発行処理ごとに変更できます。

必要に応じて `issuerDid`、`issuerKey`、`mapping`、`x5Chain` なども Runtime Override で指定できます。

### 4.2.3 Credential 発行フローの比較

v0.15.1 と v1.0.0 では、OpenID4VCI による Credential 発行処理の構成が変更されています。

v0.15.1 では、Credential Metadata を取得して発行対象を確認した後、Credential Offer の取得、Token Request、Nonce の取得、Proof JWT の作成、Credential Request、Credential の保存を段階的に処理します。

v1.0.0 では Credential Configuration と Credential Profile が分離され、Issuer2 で Credential Offer を作成した後、Wallet2 の Credential Receive API により Credential の取得から保存までの一連の処理を実行できます。

| v0.15.1 | v1.0.0 |
|---|---|
| **Credential Metadata 取得・発行対象確認**<br>`GET /.well-known/openid-credential-issuer/{standardVersion}` | **Credential Profile 確認**<br>`GET /issuer2/profiles/{profileId}` |
| ↓ | ↓ |
| **Credential Offer 作成**<br>Issuer API | **Credential Offer 作成**<br>`POST /issuer2/credential-offers` |
| ↓ | ↓ |
| **Credential Offer 取得**<br>`GET /{standardVersion}/credentialOffer?id={sessionId}` | **Credential Offer 解析**<br>`POST /wallet/{walletId}/credentials/receive/resolve-offer` |
| ↓ | ↓ |
| **Token Request**<br>`POST /{standardVersion}/token` | **Credential 取得・保存**<br>`POST /wallet/{walletId}/credentials/receive` |
| ↓ | ↳ Token Request |
| **Nonce 取得**<br>Token Response などから `c_nonce` を取得 | ↳ Nonce の取得・管理 |
| ↓ | ↳ Holder Key による Proof の作成 |
| **Proof JWT 作成**<br>Holder Key を利用して Proof を作成 | ↳ Credential Request |
| ↓ | ↳ Credential 保存 |
| **Credential Request**<br>`POST /{standardVersion}/credential` | ↓ |
| ↓ | **Credential 保存結果確認**<br>`GET /wallet/{walletId}/credentials` |
| **Credential 保存**<br>取得した Credential を Wallet に保存 | |

v1.0.0 でも Token Request、Nonce の取得、Proof の作成、Credential Request などの OpenID4VCI 処理自体がなくなったわけではありません。

今回の確認では、Wallet2 の `POST /wallet/{walletId}/credentials/receive` を利用することで、これらの処理を一連の Credential Receive Flow として実行しています。

また、Wallet2 v1.0.0 では以下の API を利用し、Credential Receive Flow を段階的に実行することもできます。

- `POST /wallet/{walletId}/credentials/receive/resolve-offer`
- `POST /wallet/{walletId}/credentials/receive/request-token`
- `POST /wallet/{walletId}/credentials/receive/sign-proof`
- `POST /wallet/{walletId}/credentials/receive/fetch-credential`
