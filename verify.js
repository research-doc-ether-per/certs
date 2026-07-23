
## 概要

各 API および Web 画面におけるファイル名・メソッド名を見直し、命名ルールを統一しました。
また、既存の ESLint 設定では正常に利用できない状態となっていたため、各 API の ESLint 設定を修正し、lint チェックを正常に実行できるよう対応しました。
あわせて、Issuer / Verifier 側に組織向け処理を追加し、Keycloak 認証処理についても API 種別ごとに細分化しました。

## 対応内容

- [ ] 同一ウェブサイトを異なる URL からアクセスすることで、それぞれ異なる Keycloak 認証画面を表示するよう修正
  - verifier-web
  - issuer-web
  - wallet-web
- [ ] `bc-wallet` 権限を使用している箇所を `VC` 権限に変更
  - wallet-api
- [ ] 各 API / Web 画面のファイル名・メソッド名を統一
  - issuer-api
  - verifier-api
  - wallet-api
  - issuer-web
  - verifier-web
  - wallet-web
- [ ] ESLint 設定を修正し、lint チェックを正常に実行できるよう対応
  - issuer-api
  - verifier-api
  - wallet-api
- [ ] Issuer 側に組織向け Credential Offer URL 発行関連処理を追加
  - issuer-api
  - issuer-web
- [ ] Credential Offer URL 発行時の Subject ID 設定処理を修正
  - issuer-api
- [ ] Verifier 側に組織向け Presentation Request 関連処理を追加
  - verifier-api
  - verifier-web
- [ ] Keycloak 認証処理を API 種別ごとに細分化
  - issuer-api
  - verifier-api
  - wallet-api
- [ ] 共通化可能な処理を整理し、重複処理を削減
  - issuer-api
  - verifier-api
  - wallet-api
  - issuer-web
  - verifier-web
  - wallet-web
