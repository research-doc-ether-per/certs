
# 7. Wallet2 の動作確認

## 7.1 Wallet2 関連ツール

Wallet2 v1.0.0 の認証、Wallet、Key、DID などの機能について、セットアップおよび一連の動作確認を行うため、以下のツールを作成しました。

| ファイル名 | 説明 |
|---|---|
| `wallet2-auth-on.js` | Wallet2 の Auth 機能を有効化し、認証に必要な設定を行います。 |
| `wallet2-auth-off.js` | Wallet2 の Auth 機能を無効化します。 |
| `wallet2-scenario-with-auth.js` | Auth 機能を有効化した状態で、ユーザー登録から Wallet、Key、DID の作成・確認・削除までの一連の処理を行います。 |
| `wallet2-scenario-without-auth.js` | Auth 機能を無効化した状態で、Wallet、Key、DID の作成・確認・削除までの一連の処理を行います。 |

## 7.2 利用手順

### Auth 機能を有効化して確認する場合

```bash
# Wallet2 の Auth 機能を有効化する
node wallet2-auth-on.js

# wallet2-auth-on.js 実行後、walt.id を再起動する

# ユーザー登録から Wallet、Key、DID の作成・削除までの一連の処理を確認する
node wallet2-scenario-with-auth.js
```
### Auth 機能を無効化して確認する場合
```bash
# Wallet2 の Auth 機能を無効化する
node wallet2-auth-off.js

# wallet2-auth-off.js 実行後、walt.id を再起動する

# Wallet、Key、DID の作成・削除までの一連の処理を確認する
node wallet2-scenario-without-auth.js
```

# Wallet2 v1.0.0 動作確認結果

## 7.3 確認結果

### 1. `auth` 機能の有効化

Wallet2 v1.0.0 では、`auth` 機能はオプション機能として提供されています。
`auth` 機能を有効化しただけでは、`ktor-authnz` Provider が登録されていないため、認証 API を正常に利用できない事象を確認しました。
そのため、`wallet-api2` の `Main.kt` に `ktor-authnz` Provider の登録処理を追加し、再ビルド・再起動を行いました。
修正後、ユーザー登録およびログインが正常に動作することを確認しました。

### 2. 認証方式

Wallet2 v1.0.0 の標準 `auth` 機能では、Email / Password によるアカウント登録・ログインおよび JWT Session による認証が提供されています。
OIDC によるユーザー認証には対応していません。

### 3. 認証情報と Wallet 情報の管理

Wallet2 では、認証用のアカウント情報と Wallet 関連情報が分離して管理されています。
Email / Password などの認証用アカウント情報は、標準実装ではメモリ上で管理されるため、Wallet API を再起動すると失われます。
一方、Account と Wallet の関連情報、および Wallet、Key、DID、Credential などのWallet 関連データは Wallet Persistence により管理されます。
`wallet2-persistence` を有効化したデフォルト構成では SQLite が使用されます。

### 4. Wallet 作成方式の変更

v0.15.1 では、ユーザー登録後の初期化処理で初期 Wallet が作成されます。
また、`registrationDefaults` が有効な場合は、初期 Wallet に対して Key の生成、DID の作成、および Default DID の設定が自動的に行われます。

v1.0.0 の Wallet2 では、`POST /wallet` により Wallet を作成しても、Key や DID 自体は自動生成されません。Key および DID は、それぞれ専用 API を使用して個別に作成する必要があります。
デフォルトの Wallet 作成時には、以下の Store が作成されます。
- Key Store
- Credential Store
- DID Store

### 5. `auth` 機能と Wallet の所有関係

Wallet2 v1.0.0 では、`auth` 機能の有効／無効により Wallet の所有関係の扱いが異なります。

1. `auth` 機能を有効化した場合
   - 認証済みユーザーから `accountId` を取得します。
   - Wallet 作成時に、取得した `accountId` と作成した `walletId` が自動的に関連付けられます。
   - Wallet 一覧取得時には、認証済み Account に紐づく Wallet のみが取得されます。

2. `auth` 機能を無効化した場合
   - Wallet2 側では、リクエストを実行したユーザーを識別しません。
   - Wallet 作成時に、リクエストユーザーに基づく Account と Wallet の自動的な関連付けは行われません。
   - Wallet API は no-auth モードで動作し、Wallet の所有関係に基づくアクセス制御も行われません。

そのため、Wallet2 自身でユーザー認証、Wallet の所有関係、および Wallet 単位のアクセス制御を行う場合は、`auth` 機能を有効化する必要があります。

`auth` 機能を使用しない場合は、呼び出し元システム側でユーザーと `walletId` の関連付け、およびアクセス制御を管理する必要があります。


### 6. Key 管理 API

Wallet2 v1.0.0 では、以下の Key 管理 API が提供されています。

| Method | API | 説明 |
|---|---|---|
| `GET` | `/wallet/{walletId}/keys` | Wallet に登録されている Key の一覧を取得する。 |
| `POST` | `/wallet/{walletId}/keys/generate` | 新しい Key を生成する。 |
| `POST` | `/wallet/{walletId}/keys/import` | 既存の Key をインポートする。 |
| `GET` | `/wallet/{walletId}/keys/{keyId}` | 指定した Key の情報を取得する。 |
| `PUT` | `/wallet/{walletId}/keys/{keyId}/set-default` | 指定した Key を Default Key に設定する。 |
| `DELETE` | `/wallet/{walletId}/keys/{keyId}` | 指定した Key を削除する。 |

### 7. DID 管理 API

Wallet2 v1.0.0 では、以下の DID 管理 API が提供されています。

| Method | API | 説明 |
|---|---|---|
| `GET` | `/wallet/{walletId}/dids` | Wallet に登録されている DID の一覧を取得する。 |
| `POST` | `/wallet/{walletId}/dids/create` | DID を作成する。`did:key`、`did:jwk`、`did:web` の3種類を作成できる。 |
| `POST` | `/wallet/{walletId}/dids/import` | 既存の DID および DID Document をインポートする。 |
| `GET` | `/wallet/{walletId}/dids/{did}` | 指定した DID の情報を取得する。 |
| `PUT` | `/wallet/{walletId}/dids/{did}/set-default` | 指定した DID を Default DID に設定する。 |
| `DELETE` | `/wallet/{walletId}/dids/{did}` | 指定した DID を削除する。 |

Default DID は DID データ側に Default フラグを保持する方式ではなく、
Wallet 側の `defaultDidId` により管理されます。

`GET /wallet/{walletId}` で Wallet 情報を取得することで、`defaultDidId` および `defaultKeyId` を確認できます。

