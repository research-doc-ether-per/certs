# walt.id v0.15.1 と v1.0.0 の差分調査結果

## 1. 概要

walt.id v1.0.0 について調査した結果、正式版の OpenID4VC 仕様への対応により、Wallet、Issuer、Verifier を中心に構成や処理方式が見直されていることを確認した。

主な変更点は以下の通り。

* OpenID4VC プロトコルの変更
* Issuer の設定方式の変更
* Wallet の管理方式の変更
* Wallet のデータ保存方式／DB 構成の変更
* Verifier の提示条件の記述方式の変更
* Session、Profile、walletId などの管理方式の変更

---

## 2. 調査結果サマリ

主な差分は以下の通り。

| 項目           | v0.15.1 / 旧 API             | v1.0.0 / API2               | 影響                          |
| ------------ | --------------------------- | --------------------------- | --------------------------- |
| OpenID4VCI   | Draft 版                     | OID4VCI 1.0                 | Credential 発行処理の見直しが必要      |
| OpenID4VP    | Draft 版                     | OID4VP 1.0                  | Credential 提示・検証処理の見直しが必要   |
| 提示条件         | Presentation Definition     | DCQL                        | Verifier の提示条件を再定義する必要がある   |
| Issuer       | API 実行時に動的設定                | Credential Profile ベース      | Issuer の設定方法を見直す必要がある       |
| Wallet       | Account に紐づいて Wallet を管理    | walletId 単位で Wallet を管理     | User と walletId の紐付け管理が必要   |
| Wallet データ保存 | PostgreSQL（現行環境）            | SQLite（デフォルト）               | DB 構成とデータ移行方法の確認が必要         |
| Verifier     | Presentation Definition ベース | DCQL + Verification Session | Verification Session の管理が必要 |
| API 互換性      | 旧 API                       | API2                        | API の置き換えだけでは移行できない         |

### 2.1 API 互換性について

旧 API と API2 では、URL、JSON スキーマ、認証方式、データ保存方式、OID4VC プロトコルなどが異なるため、API の置き換えだけでは移行できない。

```text
Original Generation（旧 API）
│
├─ Issuer API
├─ Wallet API
└─ Verifier API
      │
      │ 既存システムでは引き続き利用可能
      ▼
Current Generation（API2）
│
├─ Issuer2 API
├─ Wallet2 API
└─ Verifier2 API
```

したがって、今回の移行は単純な Endpoint の変更ではなく、以下の4つの観点で検討する必要がある。

```text
Protocol Migration
  OpenID4VCI / OpenID4VP の Draft 版から 1.0 への移行

Service Architecture Migration
  Wallet、Issuer、Verifier の構成および管理方式の変更

Application Integration Migration
  既存アプリケーションとの API 連携処理の見直し

Data / Persistence Migration
  Wallet のデータ保存方式および既存データ移行方法の確認
```

### 2.2 Wallet のデータ保存について

Wallet2 ではデータ保存方式を変更でき、デフォルトでは SQLite が使用される。

### 参考資料

* Wallet2
  https://docs.walt.id/community-stack/wallet2/getting-started

* Issuer2
  https://docs.walt.id/community-stack/issuer2/getting-started

---

# 3. Wallet の差分

## 3.1 v0.15.1 の Wallet

Wallet 機能に加えて、ユーザー管理、認証、セッション管理などの機能も備えている。

主な特徴は以下の通り。

* ユーザー登録、ログイン、セッション管理を Wallet API 内で行う。
* ユーザーと Wallet の紐付けをサービス内で管理する。
* DID、Key、Credential はユーザーアカウント単位で管理される。
* メール／パスワード、OIDC などの認証方式に対応する構成がある。
* OID4VCI / OID4VP の Draft 版、および Presentation Definition を利用する。

現行環境では、概ね以下のような構成となっている。

```text
User Account
    │
    └─ Wallet
        ├─ DID
        ├─ Key
        └─ Credential
              │
              ▼
          PostgreSQL
```

---

## 3.2 v1.0.0 の Wallet2

Wallet2 では、Wallet は DID、Key、Credential を保持する独立したリソースとして管理される。

主な特徴は以下の通り。

* `walletId` を指定して Wallet を識別・管理する。
* デフォルト構成では認証機能は無効となっている。
  * TODO: 認証機能を有効化した場合の利用方法を確認する
* データの保存方式は固定されておらず、保存先を切り替えられる。
  * TODO: データ保存先の変更方法を確認する
* OID4VCI 1.0 により Credential を受領する。
* OID4VP 1.0 および DCQL を利用して Credential を提示する。
* W3C VC、SD-JWT VC、mdoc に対応する。

公式ドキュメント上の主な差分は以下の通り。

| 比較項目                | Wallet API v1 / 現行構成  | Wallet2            |
| ------------------- | --------------------- | ------------------ |
| 認証                  | Wallet API 側で認証を管理    | デフォルトでは認証なし        |
| データ保存（Persistence）  | 既存 DB 構成（PostgreSQL）  | SQLite（デフォルト、変更可能） |
| OpenID4VC           | Draft 版               | 1.0                |
| Credential の選択・提示方法 | Presentation Exchange | DCQL               |

概ね以下のような構成となっている。

```text
Authentication
（デフォルトでは無効）
        │
        ▼
      Wallet
     walletId
        │
        ├─ Key
        ├─ DID
        └─ Credential
              │
              ▼
        Data Store
        ├─ SQLite（Default）
        └─ Other Store
           （切り替え可能）
```

### 3.3 Wallet の移行影響

| v0.15.1 の方式                              | v1.0.0 の Wallet2 での変更点          | 必要な対応                                |
| ---------------------------------------- | ------------------------------- | ------------------------------------ |
| ログインユーザーに紐づく Wallet を利用                  | `walletId` を指定して Wallet を管理     | `user_id ↔ wallet_id` の紐付け情報を管理する    |
| Wallet API 内でユーザー／認証情報を管理                | デフォルトでは Wallet2 側の認証なし          | 自社 User DB または外部 IdP で認証を管理する方式を検討する |
| 旧 Session / Token を利用                    | 旧 Session / Token との互換性は前提にできない | 再ログインや Token の再発行が必要か確認する            |
| Presentation Definition で Credential を選択 | DCQL で Credential を選択           | Credential の選択・提示処理を DCQL 対応に変更する    |
| 旧 OIDC ログイン設定を利用                         | 既存設定をそのまま利用できる前提ではない            | BFF または外部認証との連携方式を見直す                |

なお、`user_id ↔ wallet_id` の紐付け管理は Wallet2 の必須仕様ではなく、既存システム側で User と Wallet の所有関係を管理する場合の対応案である。

### 参考資料

* Wallet2 – Getting Started
  Wallet API v1 / v2 の差分、OID4VCI / OID4VP 1.0、DCQL、Authentication、Persistence の変更点を確認。
  https://docs.walt.id/community-stack/wallet2/getting-started

---

# 4. Issuer の差分

## 4.1 v0.15.1 の Issuer

v0.15.1 では、API 呼出時に Issuer の DID、Key、Credential Data などを動的に指定できる構成となっている。

主な特徴は以下の通り。

* `/onboard/issuer` を使用して Issuer の DID／Key 情報を作成・設定する。
* API 呼出時に Issuer、Key、DID、Credential Data などを動的に指定できる。
* Issuer の設定処理と Credential 発行処理が同じ API 層で扱われる。

### 参考資料

* Original Issuer onboarding
  `/onboard/issuer` による Key／DID 設定の参考情報。
  https://github.com/walt-id/waltid-identity/issues/530

---

## 4.2 v1.0.0 の Issuer2

Issuer2 では、Issuer や Credential の基本設定をあらかじめ Profile として定義し、実行時にはその Profile を利用して Credential Offer を作成する方式に変更されている。
  * TODO: Issuer の作成・設定方法を確認する
```text
事前設定
  │
  ├─ Credential Issuer Metadata
  │    └─ Credential Type / Format / Algorithm / Display 情報
  │
  └─ Credential Profile
       ├─ issuerKey
       ├─ issuerDid / x5Chain
       ├─ credentialConfigurationId
       ├─ credentialData
       ├─ mapping
       └─ status / notification 設定

実行時
  │
  └─ Credential Offer
       ├─ profileId
       ├─ PRE_AUTHORIZED / AUTHORIZED
       ├─ PIN / 有効期限
       └─ runtimeOverrides
            └─ Profile のデフォルト設定の一部を発行時に上書き
```

`runtimeOverrides` を使用すると、Profile のデフォルト設定をそのまま利用しつつ、Credential Offer 作成時に必要な項目だけを実行時に変更できる。

つまり、v0.15.1 のように毎回 Issuer 情報を API で設定する方式から、

> **事前に定義した Credential Profile を基に、必要な項目のみ実行時に上書きして Credential を発行する方式**

へ変更されている。

Community Stack では、Credential Profile は API から参照できるが、API 経由での作成・編集はできない。

また、Credential Profile の追加・変更後は、設定内容を反映するため Issuer2 の再起動が必要となる。

### 4.3 Issuer の移行影響

| v0.15.1 の方式                          | v1.0.0 の Issuer2 での変更点                   | 必要な対応                         |
| ------------------------------------ | ---------------------------------------- | ----------------------------- |
| `/onboard/issuer` で Issuer を動的に作成・設定 | Credential Profile を事前に設定                | Issuer の作成・設定方法を別途検討する        |
| API リクエスト内で Key／DID を指定              | Profile で Key／DID／x5Chain を管理            | Key／DID の管理方法を見直す             |
| API 呼出時に直接 Credential を発行            | Credential Offer を作成し、Wallet が取得         | Offer の ID、有効期限、状態を管理する       |
| Credential Data を実行時に指定              | `runtimeOverrides` で Profile の一部設定を上書き可能 | 実行時に変更可能な項目を整理する              |
| Issuer の DID／Key を実行時に設定             | Issuer 情報を Profile として管理                 | Profile の変更・承認・バージョン管理方法を検討する |

### 参考資料

* Issuer2 – Getting Started
  Profile-based Architecture、OID4VCI 1.0、`runtimeOverrides` の仕様を確認。
  https://docs.walt.id/community-stack/issuer2/getting-started

* Credential Profiles
  Credential Profile の構成、参照方法、管理方法を確認。
  https://docs.walt.id/community-stack/issuer2/credential-profiles/overview

---

# 5. Verifier の差分

## 5.1 v0.15.1 の Verifier

v0.15.1 の Verifier では、OID4VP の Draft 版と Presentation Definition を使用して Credential の提示条件を定義する。

主な特徴は以下の通り。

* `input_descriptors`、`submission_requirements` などを使用して提示条件を定義する。
* Wallet から VP を受け取り、Verifier 側で内容を検証する。
* 旧 Verification Policy を使用して検証ルールを適用する。

---

## 5.2 v1.0.0 の Verifier2

Verifier2 では、OpenID4VP 1.0 と DCQL を使用して Credential の提示・検証を行う。

主な特徴は以下の通り。

* DCQL を使用して、Wallet に要求する Credential や Claim を指定する。
* Verification Session を使用して、検証処理の状態を管理する。
* Authorization Request の生成、Wallet Response の受信、検証結果の取得を Session 単位で管理する。
* SSE を利用して検証状態の変更を通知できる。
* `jwt_vc_json`、`dc+sd-jwt`、`mso_mdoc` などの Credential Format に対応している。
* 新しい `verification-policies2` を使用して検証ルールを適用する。

Verifier2 における Credential 検証の処理フローは以下の通り。

```text
業務システム
    │
    └─ Verification Session を作成
          │
          └─ DCQL Query を指定
                │
                ▼
Verifier2
    │
    └─ Authorization Request / QR URL を生成
                │
                ▼
Wallet
    │
    └─ DCQL を確認
         └─ 対象 Credential を選択
              └─ vp_token を送信
                        │
                        ▼
Verifier2
    │
    ├─ VP の検証
    ├─ DCQL 条件の確認
    ├─ 署名の検証
    ├─ Policy の適用
    └─ Status の確認
          │
          ▼
Verification Session を更新
```

### 5.3 Verifier の移行影響

| v0.15.1 の方式                                         | v1.0.0 の Verifier2 での変更点              | 必要な対応                         |
| --------------------------------------------------- | ------------------------------------- | ----------------------------- |
| Presentation Definition で提示条件を定義                    | DCQL で提示条件を定義                         | Credential の提示条件を DCQL で再定義する |
| `input_descriptors` / `submission_requirements` を使用 | `credentials` / `credential_sets` を使用 | 既存の提示条件を DCQL 形式で再定義する        |
| OID4VP Draft 版のパラメータを使用                             | OID4VP 1.0 のパラメータを使用                  | クライアント側の OID4VP 処理を更新する       |
| 1回の検証処理を中心に管理                                       | Verification Session 単位で管理            | `sessionId` と Session 状態を管理する |
| 旧 Verification Policy を使用                           | `verification-policies2` を使用          | 独自 Policy を使用している場合は移行可否を確認する |

### 参考資料

* Verifier API 2 README
  Original Verifier と Verifier2 の差分、OpenID4VP 1.0、DCQL、Verification Session、Policy を確認。
  https://github.com/walt-id/waltid-identity/blob/main/waltid-services/waltid-verifier-api2/README.md

* OpenID4VP Core
  OpenID4VP 1.0 および DCQL 関連の実装を確認。
  https://github.com/walt-id/waltid-identity/blob/main/waltid-libraries/protocols/waltid-openid4vp/README.md

---

# 6. 参考資料

## Wallet2 – Getting Started

Wallet API v1 / v2 の差分、OID4VCI / OID4VP 1.0、DCQL、Authentication、Persistence の変更点を確認。

https://docs.walt.id/community-stack/wallet2/getting-started

## Issuer2 – Getting Started

Issuer2 の Profile-based Architecture、OID4VCI 1.0、`runtimeOverrides` の仕様を確認。

https://docs.walt.id/community-stack/issuer2/getting-started

## Credential Profiles

Credential Profile の構成、API での参照可否、管理方法を確認。

https://docs.walt.id/community-stack/issuer2/credential-profiles/overview

## Verifier API 2

Original Verifier と Verifier2 の差分、OpenID4VP 1.0、DCQL、Verification Session、Policy を確認。

https://github.com/walt-id/waltid-identity/blob/main/waltid-services/waltid-verifier-api2/README.md

## OpenID4VP Core

OpenID4VP 1.0、DCQL 関連の実装を確認。

https://github.com/walt-id/waltid-identity/blob/main/waltid-libraries/protocols/waltid-openid4vp/README.md
