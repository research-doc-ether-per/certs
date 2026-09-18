# 4. Verifier2 の動作確認

OpenID4VP による Credential の提示・検証について、一連の動作確認を行うため、以下のツールを作成しました。

| ファイル名 | 説明 |
|---|---|
| `openid4vp-credential-verification.js` | Verifier2 で Verification Session を作成し、Wallet2 で Credential の検索・選択・提示を行い、Verifier2 で検証結果を確認します。 |

## 4.1 利用手順

### 4.1.1 Credential 提示・検証

以下の流れで Credential の提示・検証を行います。

1. Verifier2 で Verification Session を作成する  
   `POST /verification-session/create`

2. Verification Session から Authorization Request を取得する  
   `GET /verification-session/{sessionId}/request`

3. Wallet2 で Authorization Request を解析する  
   `POST /wallet/{walletId}/credentials/present/resolve-request`

4. DCQL の条件に一致する Credential を Wallet 内から検索する  
   `POST /wallet/{walletId}/credentials/present/match-credentials-from-store`

5. 一致した Credential から提示する Credential を選択する  
   Credential Matching の結果から提示対象の Credential を選択する

6. 選択した Credential から VP Token を生成する  
   `POST /wallet/{walletId}/credentials/present/build-vp-token`

7. Presentation Response を Verifier2 に送信する  
   `POST /wallet/{walletId}/credentials/present/send-response`  
   Wallet2 から Authorization Request の `response_uri` に対して Presentation Response が送信される  
   `POST /verification-session/{sessionId}/response`

8. Verifier2 で Credential を検証する  
   Presentation Response の受信時に Verifier2 で検証が行われる

9. Verification Session から検証結果を確認する  
   `GET /verification-session/{sessionId}/info`

本ツールでは、単一および複数の Credential の組み合わせについて提示・検証を行います。

検証対象：

- 単一
  - `Awards_jwt_vc_json`
  - `Awards_vc+sd-jwt`
  - `Career_jwt_vc_json`
  - `Career_vc+sd-jwt`
  - `Qualifications_jwt_vc_json`

- 組み合わせ
  - `Qualifications_jwt_vc_json` + `Career_vc+sd-jwt` + `Awards_vc+sd-jwt`
  - `Qualifications_jwt_vc_json` + `Career_jwt_vc_json` + `Awards_jwt_vc_json`
  - `Career_vc+sd-jwt` + `Awards_vc+sd-jwt`
  
``` bash
node openid4vp-credential-verification.js
```
