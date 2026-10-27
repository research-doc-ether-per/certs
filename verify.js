# walt.id v0.15.1 → v1.0.0 DB移行後の提示処理動作確認

## 1. 確認対象

DB 移行前後で、以下のユーザ・Credential を対象に動作確認を実施する。

### 1.1 個人

| 確認対象ユーザ | 確認対象 Credential |
|---|---|
| `test_wallet01` | 表彰 JWT / 資格 JWT / 基本4情報 |
| `test_wallet02` | 表彰 SD-JWT |

### 1.2 組織

| 確認対象ユーザ | 確認対象 Credential |
|---|---|
| `group3` | 表彰 JWT |
| `group2` | 表彰 SD-JWT |

---

## 2. 実施手順

1. `walt.id v0.15.1 → v1.0.0 DB マイグレーション手順` に従い、Wallet・DID・Key・Credential などの Wallet 関連データを移行する。

2. `walt.id v0.15.1 → v1.0.0：カスタム移行ツール（JavaScript）` の手順に従い、Account・Wallet 名・DID Alias・OIDC 関連情報などのユーザ関連データを移行する。

3. `ログイン関連データ確認ツール` の手順に従い、対象ユーザに紐付く Wallet 情報を取得する。

4. 取得した `wallets` 情報を `../config/walletInfo.json` にコピーする。

5. 対象 Wallet が保持している Credential 情報を確認する。

6. `../presentation.json` の内容を `../config/presentation.json` にコピーする。

7. 対象 Wallet が保持している Credential に合わせて、`openid4vp-credential-verification.js` 内の FIXME 設定を修正する。

8. OpenID4VP の検証処理を実行し、JWT / SD-JWT Credential の検証結果を確認する。

---

## 3. 注意事項

### 3.1 Issuer 情報

v0.15.1 で使用していた Issuer 情報を、v1.0.0 側にも設定する。

設定が一致していない場合、検証結果の `signature` が `false` になる可能性がある。

### 3.2 VC Status

VC Status を確認する場合、`vc-registry-api` の VC データ取得 API では、Issuer 署名済み JWT 形式でレスポンスを返す必要がある。

形式が正しくない場合、検証結果の `credential-status` が `false` になる可能性がある。
