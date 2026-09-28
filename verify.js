
### 9.2.1 VC 検証ポリシー一覧

- [参照: verifier2 available-policies](https://docs.walt.id/community-stack/verifier2/policies/available-policies)

#### 9.2.1.1 標準搭載 VC policy

| policy | 検証内容 | 標準だけで利用 | 備考 |
|---|---|---|---|
| `signature` | 発行者署名・改ざんの検証 | 可 | 基本 policy。 |
| `expiration` | Credential の有効期限を検証 | 可 | 有効期限切れの Credential を検出する。 |
| `not-before` | Credential の有効開始日時を検証 | 可 | 有効開始前の Credential を検出する。 |
| `allowed-issuer` | 許可済み issuer DID のみ受理 | 可 | allow-list を設定する。 |
| `credential-status` | Credential Status の検証 | 可 | W3C / IETF の Status List に対応。今回は W3C Bitstring Status List の失効確認に使用する。 |
| `revoked-status-list` | W3C StatusList2021 の失効状態を検証 | 可 | StatusList2021 向けの policy。 |
| `regex` | claim の固定値・文字列形式を検証 | 可 | 例：職種、メール、番号形式。 |
| `schema` | 必須フィールド、型、enum、pattern、JSON 構造を検証 | 可 | JSON Schema を使用する。 |
| `vct-integrity` | SD-JWT VC の VCT Integrity を検証 | 可 | SD-JWT VC 向け。 |
| `vical` | VICAL に基づく検証 | 可 | mdoc 関連の検証で使用する。 |
| `etsi-trust-list` | ETSI Trust List に基づく検証 | 可 | Trust List に基づく検証で使用する。 |
| `webhook` | 外部 HTTP endpoint に任意の判定を委譲 | policy 自体は標準搭載 | endpoint 側の実装が必要。 |

#### 9.2.1.2 標準搭載 VP policy

VP policy は、Credential 本体ではなく、holder が今回の検証セッション向けに作成した presentation を検証します。

| 形式 | 主な policy | 検証内容 |
|---|---|---|
| `jwt_vc_json` | `jwt_vc_json/audience-check` / `jwt_vc_json/nonce-check` / `jwt_vc_json/envelope_signature` | verifier 宛ての VP であること、リプレイ防止、holder による VP 署名 |
| `dc+sd-jwt` | `dc+sd-jwt/audience-check` / `dc+sd-jwt/nonce-check` / `dc+sd-jwt/kb-jwt_signature` / `dc+sd-jwt/sd_hash-check` | verifier 宛てであること、holder binding、選択的開示の整合性 |

#### 9.2.1.3 DCQL でできること（証明書・claim の要求）

| 要件 | DCQL での実現方法 | 標準機能のみ |
|---|---|---|
| 特定の W3C JWT VC を要求 | `format: "jwt_vc_json"` と `meta.type_values` | 可 |
| 特定の SD-JWT VC を要求 | `format: "dc+sd-jwt"` と `meta.vct_values` | 可 |
| 複数の Credential をすべて要求する（A AND B） | `credentials` に複数 query を指定する | 可 |
| 複数の Credential のうち、いずれかを要求する（A OR B） | `credential_sets` で OR 条件を指定する | 可 |
| 複数の Credential の組み合わせを条件として要求する（A AND B、A AND (B OR C)） | `credential_sets` で組み合わせを指定する | 可 |
| claim の値に対して業務条件を判定する | 期間計算・数値比較などは DCQL では行わず、Policy 等で検証する | 不可 |

#### 9.2.1.4 標準 policy だけで実現できる条件例

| 要件例 | 実現方法 |
|---|---|
| 証明書が未失効・未期限切れ・正しい issuer である | `signature` + `expiration` + `allowed-issuer` + `credential-status` |
| Career の `category` が `sales` である | `regex`: `^sales$` |
| Career の `organization` が必須で、指定した文字列形式である | `schema` の `required` + `pattern`、または `regex` |
| Career の `position` が `director` / `manager` のいずれか | `schema` の `enum` |
| ネストしたオブジェクト内の項目を必須にする（例：`address.country`、`address.city`） | `schema` のネストした `required` |
| A 種証明書と B 種証明書の両方が必要 | DCQL の複数 credential query または `credential_sets` |
| A 種、B 種、C 種のいずれか 1 つが必要 | DCQL `credential_sets` の OR |
| SD-JWT から職種だけを開示させる | DCQL `claims` で対象 path を要求し、`regex` で値を検証する |

#### 9.2.1.5 標準 policy だけでは実現できない条件

| 要件例 | 理由 | 対応方法 |
|---|---|---|
| Career の `to - from >= 3年` | 2 つの日付から期間を計算する標準 policy はない | `webhook` またはカスタム Kotlin policy |
| Awards の表彰日が現在から 5 年以内 | 任意の claim と現在日時を比較する標準 policy はない | `webhook`、カスタム Kotlin policy、または発行時に有効期限を設定して `expiration` を使用 |
| 証明書 A の subject ID と証明書 B の subject ID が同一 | 複数 Credential 間の claim を比較する標準 policy はない | `webhook` またはカスタム Kotlin policy |
| 金額が上限以下、年齢が 18 歳以上などの数値条件 | 任意の claim に対する数値計算・比較を行う汎用 policy はない | `webhook` またはカスタム Kotlin policy |
| DB の在籍状態、権限、ブラックリストを照会 | 内蔵 policy は業務 DB を直接照会しない | `webhook` |
| 任意の業務ルールを式として実行 | CEL / JavaScript / JSONata のような汎用式言語は内蔵していない | `webhook` またはカスタム Kotlin policy |

#### 9.2.1.6 Webhook とカスタム Kotlin policy の違い

| 方式 | 実装場所 | Verifier API2 の再ビルド | 向くケース |
|---|---|---|---|
| `webhook` | 外部の業務 API | 不要 | DB 照会、既存業務サービスとの連携、頻繁に変わるルール |
| カスタム Kotlin policy | Verifier API2 のコード内 | 必要 | 外部通信なしの計算、Verifier 内で完結させたい固定ルール |
