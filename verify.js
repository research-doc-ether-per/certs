# 🧩 ステータスリストタイプ一覧と walt.id 対応方針

| 名称 | 系統 / 提案元 | 主な用途・特徴 | データ形式 | W3C / IETF 公式リンク |
|------|----------------|----------------|--------------|------------------------|
| **RevocationList2020** | W3C CCG（初期提案） | 最初期のステータスリスト。VCの失効（revocation）のみ管理。ビット列＋GZIP＋Base64URL構造を採用。 | JSON-LD | [https://w3c-ccg.github.io/vc-status-rl-2020/](https://w3c-ccg.github.io/vc-status-rl-2020/) |
| **StatusList2021** | W3C（後継仕様） | RevocationList2020 の拡張版。撤回だけでなく一時停止なども扱える汎用ステータス。 | JSON-LD | [https://www.w3.org/TR/vc-status-list-20230427/](https://www.w3.org/TR/vc-status-list-20230427/) |
| **BitstringStatusList** | W3C（VC v2対応） | StatusList2021 の最新版名称。構造は同じだが「ビット列方式」であることを明示。walt.id v0.15.1 で標準採用。 | JSON-LD / JWT-VC | [https://www.w3.org/TR/vc-bitstring-status-list/](https://www.w3.org/TR/vc-bitstring-status-list/) |
| **TokenStatusList** | IETF / OAuth / SD-JWT | IETF系のステータスリスト。JWT（またはCWT）形式でトークンの状態を管理。W3Cルートとは別系統。 | JWT / CWT | [https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/](https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/) |

---

## 🧠 walt.id における SD-JWT のステータス管理実装方針

### 1️⃣ TokenStatusList（IETF方式）で検証する場合

#### 🔧 必要な修正 / 追加

1. **ステータス管理サーバー側**
   - VCの `format` ごとにインデックスを割り当てる API の修正。
   - `sd-jwt` 専用の公開 API を追加（verifier が照会できるようにする）。

2. **Verifier（walt.id側）設定**
   - VC 検証時に `vc_policies` 内で以下のポリシーを使用：

     ```json
     {
       "policy": "credential-status",
       "args": {
         "discriminator": "ietf",
         "type": "TokenStatusList",
         "value": 0
       }
     }
     ```

   - `revoked-status-list` は **使用しない**。

#### 🔄 実装補足

- サーバー側で `zlib.deflateSync()` による圧縮を使用（walt.id の `InflaterInputStream` に対応）。
- ビット列の順序は **MSB-first**（walt.id の `BitValueReader` に合わせる）。
- JWT ペイロード例：

  ```json
  {
    "status": {
      "status_list": {
        "purpose": "revocation",
        "size": 65536,
        "lst": "<Base64URL encoded deflate bitset>"
      }
    },
    "iss": "did:example:issuer",
    "iat": 1718000000
  }
  ```

---

### 2️⃣ W3C系フォーマットで検証する場合

#### 🧩 利用条件

- SD-JWT VC には `credentialStatus` 属性がないため、walt.id 側を修正して `status` 情報を取得できるようにする。

#### 🔧 修正箇所

- 対象ファイル：
  [`StatusPolicyImplementation.kt`](https://github.com/walt-id/waltid-identity/blob/v0.15.1/waltid-libraries/credentials/waltid-verification-policies/src/jvmMain/kotlin/id/walt/policies/policies/status/StatusPolicyImplementation.kt)

- 修正内容：
  - `verifyWithAttributes()` 内で `getStatusEntryElementExtractor(attributes).extract(data)` が `null` の場合、
    次のように `data.jsonObject["credentialStatus"]?.jsonObject` を参照する処理を追加。

  ```kotlin
  val statusElement = getStatusEntryElementExtractor(attributes).extract(data)
      ?: data.jsonObject["credentialStatus"]?.jsonObject
  ```

- これにより、SD-JWT を **W3C形式（BitstringStatusListなど）** に近い形で検証できる。

---

## ✅ まとめ

| 検証方式 | ステータスリスト | 圧縮形式 | 位順序 | サーバー修正 | Verifier修正 |
|------------|------------------|-----------|----------|----------------|----------------|
| **IETF TokenStatusList** | `status.status_list.lst` | Deflate(Base64URL) | MSB-first | 必須 | 不要（policiesで指定） |
| **W3C BitstringStatusList** | `credentialStatus` | GZIP(Base64URL) | LSB-first | 不要 | 必須（StatusPolicyImplementation修正） |

