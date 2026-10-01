出力結果に含まれる各項目の意味は以下のとおりです。

#### トップレベル

| 項目 | 説明 |
|---|---|
| `individual` | 単一 Credential の検証結果を格納します。 |
| `combined` | 複数 Credential を組み合わせた検証結果を格納します。 |

`individual` および `combined` は配列であり、各要素が 1 回の Verification Session に対応します。

#### 各 Verification Session の項目

| 項目 | 説明 |
|---|---|
| `walletId` | Credential の提示に使用した Wallet の ID です。 |
| `createVerificationSessionParams` | Verification Session 作成時に Verifier2 へ指定したパラメータです。 |
| `extractedPolicyResults` | Verifier2 の検証結果から、各 Policy の実行結果を抽出した情報です。 |
| `selectCredentialDetails` | DCQL の条件に一致した Credential、および提示対象として選択した Credential の情報です。 |

#### `createVerificationSessionParams` の主な項目

| 項目 | 説明 |
|---|---|
| `flow_type` | Verification Flow の種類です。本ツールでは `cross_device` を使用します。 |
| `core_flow.dcql_query.credentials` | Wallet に提示を要求する Credential の条件を定義します。 |
| `core_flow.dcql_query.credential_sets` | 複数 Credential の組み合わせ条件を定義します。 |
| `core_flow.policies.vc_policies` | 提示された Credential に共通して適用する VC Policy です。 |
| `core_flow.policies.specific_vc_policies` | Credential ごとに個別に適用する VC Policy です。 |
| `core_flow.policies.vp_policies` | Presentation に対して適用する VP Policy です。 |

#### `extractedPolicyResults` の主な項目

| 項目 | 説明 |
|---|---|
| `vp` | VP Policy ごとの検証結果です。 |
| `vc` | Credential ごとの VC Policy の検証結果です。 |

Policy の検証結果は Boolean 値で出力します。

- `true`：Policy の検証に成功
- `false`：Policy の検証に失敗
