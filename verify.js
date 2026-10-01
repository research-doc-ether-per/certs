# 9. Verifier2 の動作確認

OpenID4VP による Credential の提示・検証について、一連の動作確認を行うため、以下のツールを作成しました。

| ファイル名 | 説明 |
|---|---|
| `openid4vp-credential-verification.js` | Verifier2 で Verification Session を作成し、Wallet2 で Credential の検索・選択・提示を行い、Verifier2 で検証結果を確認します。 |

## 9.1 利用手順

### 前提条件

1. VC Status（VC の有効・失効管理）機能も確認対象に含めるため、`vc-registry-api` が起動していること。

   ```bash
   cd ~/workspace/cloudcredentialservice/services/vc-registry-api/

   # サーバー起動
   npm run dev
   ```

2. VC を失効させるためのツールが使用可能であること。

   ```text
   ~/workspace/cloudcredentialservice/tools/curls/vc-registry-api.js
   ```

3. `webhook` Policy の動作確認用 Custom Verification Webhook Server が起動していること。

   - 参照: `../v1.0.0_custom-webhook-server/README.md`

4. `vct-integrity` Policy の動作確認用 Metadata Server が起動していること。

   - 参照: `../v1.0.0_custom-vct-metadata-server/README.md`

5. `~/workspace/cloudcredentialservice/samples/v1.0.0/input-datas/wallet-info.json` にて、ローカル環境で作成済みの Wallet 情報が正しく設定されていることを確認してください。

6. `~/workspace/cloudcredentialservice/samples/v1.0.0/input-datas/presentation-data.json` にて、Policy の設定内容に問題がないことを確認してください。

7. Wallet が保有している Credential を確認し、提示対象となる Credential が存在することを確認してください。

   - 保有 Credential 確認ツール

   ```bash
   cd ~/workspace/cloudcredentialservice/samples/v1.0.0/src

   # FIXME: 必要に応じて、ツール内の以下の情報を修正してください
   # - walletInfo

   node get-wallet-credentials.js
   ```

   - 結果は以下のファイルに出力されます。

   ```text
   ../output/wallet-credentials.json
   ```

   - 提示対象 Credential の設定は、以下のファイルで行います。

   ```text
   openid4vp-credential-verification.js
   ```

### Credential 提示・検証の流れと実施手順

以下の流れで Credential の提示・検証を行います。

1. Verifier2 で Verification Session を作成する  
   `POST /verification-session/create`

2. Verification Session から Authorization Request を取得する  
   `GET /verification-session/{sessionId}/request`

3. Wallet2 で Authorization Request を解析する  
   `POST /wallet/{walletId}/credentials/present/resolve-request`

4. DCQL の条件に一致する Credential を Wallet 内から検索する  
   `POST /wallet/{walletId}/credentials/present/match-credentials-from-store`

5. 一致した Credential から提示対象を選択する  
   Credential Matching の結果から、提示する Credential を選択します。

6. 選択した Credential から VP Token を生成する  
   `POST /wallet/{walletId}/credentials/present/build-vp-token`

7. Presentation Response を Verifier2 に送信する  
   `POST /wallet/{walletId}/credentials/present/send-response`

   Wallet2 から Authorization Request の `response_uri` に対して Presentation Response が送信されます。

   `POST /verification-session/{sessionId}/response`

8. Verifier2 で Credential を検証する  
   Presentation Response の受信時に Verifier2 で検証が実行されます。

9. Verification Session から検証結果を確認する  
   `GET /verification-session/{sessionId}/info`

本ツールでは、単一 Credential および複数 Credential の組み合わせについて提示・検証を行います。

#### 検証対象

- 単一
  - `Awards_jwt_vc_json`
  - `Awards_dc+sd-jwt`
  - `Career_jwt_vc_json`
  - `Career_dc+sd-jwt`
  - `Qualifications_jwt_vc_json`

- 組み合わせ
  - `Qualifications_jwt_vc_json` + `Career_dc+sd-jwt` + `Awards_dc+sd-jwt`
  - `Qualifications_jwt_vc_json` + `Career_jwt_vc_json` + `Awards_jwt_vc_json`
  - `Career_dc+sd-jwt` + `Awards_dc+sd-jwt`

実行：

```bash
node openid4vp-credential-verification.js
```

## 9.2 確認結果

### 9.2.1 Policy 一覧および今回の確認状況

- [参照: verifier2 available-policies](https://docs.walt.id/community-stack/verifier2/policies/available-policies)

| Policy | 主な用途 | 標準搭載 | 今回確認 |
|---|---|---:|---:|
| `signature` | Credential の署名・改ざん検証 | ○ | ○ |
| `expiration` | 有効期限の検証 | ○ | ○ |
| `not-before` | 有効開始日時の検証 | ○ | ○ |
| `allowed-issuer` | 許可された issuer のみ受理 | ○ | ○ |
| `credential-status` | Credential Status の検証 | ○ | ○ |
| `revoked-status-list` | Status List による失効確認 | ○ | 未確認 |
| `regex` | claim の固定値・文字列形式の検証 | ○ | ○ |
| `schema` | `required` / `type` / `enum` / `pattern` 等の検証 | ○ | ○ |
| `vct-integrity` | SD-JWT VC の VCT Integrity 検証 | ○ | ○ |
| `vical` | VICAL に基づく検証 | ○ | 未確認 |
| `etsi-trust-list` | ETSI Trust List に基づく検証 | ○ | 未確認 |
| `webhook` | 外部 HTTP endpoint に検証を委譲 | ○ | ○ |
| `date-within` | claim の日付が現在から指定期間内かを検証 | カスタム | ○ |

今回未確認の標準 Policy は以下の 3 つです。

- `revoked-status-list`
- `vical`
- `etsi-trust-list`

### 9.2.2 DCQL と複数 Credential の組み合わせ

DCQL は、Wallet に対して「どの Credential / claim を提示させるか」を指定するために使用します。

主に以下を指定できます。

| 要件 | 設定方法 |
|---|---|
| 特定の JWT VC を要求 | `format: "jwt_vc_json"` + `meta.type_values` |
| 特定の SD-JWT VC を要求 | `format: "dc+sd-jwt"` + `meta.vct_values` |
| 特定 claim を要求 | `claims` |
| A AND B | `credential_sets.options: [[A, B]]` |
| A OR B | `credential_sets.options: [[A], [B]]` |
| A AND (B OR C) | `credential_sets.options: [[A, B], [A, C]]` |

`credential_sets` は Credential の存在・組み合わせ条件を指定するための設定です。  
Credential の内容自体の検証は、`vc_policies` または `specific_vc_policies` で行います。

### 9.2.3 Global VC Policy と Specific VC Policy

複数 Credential を検証する場合、VC Policy は以下の 2 種類に分けて設定できます。

| 設定 | 適用範囲 | 用途 |
|---|---|---|
| `vc_policies` | 提示された Credential に共通して適用 | `signature`, `expiration`, `credential-status` など |
| `specific_vc_policies` | 指定した Credential のみに適用 | `regex`, `date-within`, `webhook` など Credential 固有の条件 |

#### Global VC Policy

提示された Credential に共通する検証を設定します。

```json
{
  "vc_policies": [
    {
      "policy": "signature"
    },
    {
      "policy": "expiration"
    },
    {
      "policy": "credential-status"
    }
  ]
}
```

#### Specific VC Policy

Credential ごとに異なる検証条件を設定する場合は、`specific_vc_policies` を使用します。

```json
{
  "specific_vc_policies": {
    "Awards_JWT_VERIFICATION_TRUE": [
      {
        "policy": "regex",
        "path": "$.credentialSubject.type",
        "regex": "^award$"
      },
      {
        "policy": "date-within",
        "path": "$.credentialSubject.issuedAt",
        "format": "yyyy/MM/dd",
        "value": 3,
        "unit": "years"
      }
    ]
  }
}
```

`specific_vc_policies` の key には、DCQL の `credentials[].id` と同じ Credential ID を指定します。

また、複数 Credential の組み合わせを `credential_sets` で指定する場合も、`credential_sets.options` には同じ Credential ID を使用します。

```text
credentials[].id
      ├─ credential_sets.options
      └─ specific_vc_policies
```

このため、上記 3 箇所で使用する Credential ID は一致させる必要があります。

### 9.2.4 標準 Policy だけでは対応できない条件

標準 Policy だけでは対応できない業務条件については、`webhook` またはカスタム Kotlin Policy で対応します。

| 要件例 | 対応方法 |
|---|---|
| Career の `to - from >= 3年` | `webhook` / Custom Kotlin Policy |
| Awards の `issuedAt` が現在から N 年以内 | `date-within` / `webhook` |
| Credential A と B の subject ID が同一 | `webhook` / 業務バックエンド |
| 金額・年齢などの数値条件 | `webhook` / Custom Kotlin Policy |
| DB の在籍状態・権限・ブラックリスト確認 | `webhook` |
| 任意の業務ルール | `webhook` / Custom Kotlin Policy |

今回、標準 Policy では対応できない日付条件を Verifier2 内で検証するため、Custom Kotlin Policy として `date-within` を追加し、動作確認を実施しました。
