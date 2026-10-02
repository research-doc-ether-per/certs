
"claim_sets": [
    [
      "name",
      "issuedAt"
    ],
    [
      "name",
      "issuerName"
    ]
  ]


### 9.2.3 DCQL と複数 Credential の組み合わせ

DCQL は、Wallet に対して「どの Credential / claim を提示させるか」を指定するために使用します。

主に以下を指定できます。

| 要件 | 設定方法 | 今回確認 |
|---|---|---:|
| 特定の JWT VC を要求 | `format: "jwt_vc_json"` + `meta.type_values` | ○ |
| 特定の SD-JWT VC を要求 | `format: "dc+sd-jwt"` + `meta.vct_values` | ○ |
| Credential の発行元等に対する信頼条件を指定 | `trusted_authorities` | 未確認 ※1 |
| 特定 claim を要求 | `claims` | ○ |
| claim の組み合わせ条件を指定 | `claim_sets` | ○ |
| A AND B | `credential_sets.options: [[A, B]]` | ○ |
| A OR B | `credential_sets.options: [[A], [B]]` | ○ |
| A AND (B OR C) | `credential_sets.options: [[A, B], [A, C]]` | ○ |

※1 `trusted_authorities` は、Credential の発行元が信頼できる発行元であるかを確認するための設定です。今回使用した JWT VC / SD-JWT VC は `did:web` を使用して発行しており、証明書チェーンや AKI（Authority Key Identifier）を使用した `trusted_authorities` の検証対象ではないため、本項目の動作確認は実施していません。

`claim_sets` は、`claims` に定義した claim ID を使用して、1つの Credential 内で満たす必要がある claim の組み合わせを指定します。

`credential_sets` は、複数の Credential Query のうち、どの組み合わせを満たす必要があるかを指定するための設定です。

Credential の内容自体の検証は、`vc_policies` または `specific_vc_policies` で行います。
