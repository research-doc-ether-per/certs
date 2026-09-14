
Wallet2 v1.0.0 では、以下の Wallet 管理 API が提供されています。

| Method | API | 説明 |
|---|---|---|
| `POST` | `/wallet` | 新しい Wallet を作成する。 |
| `GET` | `/wallet` | Wallet の一覧を取得する。 |
| `GET` | `/wallet/{walletId}` | 指定した Wallet の詳細情報を取得する。 |
| `DELETE` | `/wallet/{walletId}` | 指定した Wallet を削除する。 |



clientId などの固定値を設定情報から取得するように

現状、一部の API および Web 側の処理において、clientId や realmName がコード内に固定値として定義されている。
そのため、環境ごとに clientId や realmName が異なる場合、ソースコードを直接修正する必要があり、環境差分への対応や設定変更時の保守性に問題がある。
API 側については、各 API の設定ファイルから値を取得する形に修正する必要がある。
Web 側については、環境変数から値を取得する形に修正する必要がある。


wallet-api：Wallet API の PAT Token 取得時に使用している clientId を、設定ファイルから取得する必要がある。
issuer-api：VC Registry API の Access Token 取得時に使用している clientId と realmName を、設定ファイルから取得する必要がある。
verifier-api：修正不要。
specific-issuer-api：Specific Issuer API の PAT Token 取得時に使用している clientId を、設定ファイルから取得する必要がある。
wallet-web：指定 clientId の権限取得時に使用している clientId を、環境変数から取得する必要がある。
issuer-web：修正不要。
verifier-web：修正不要。


コード内に固定値として定義されている clientId および realmName の取得方法を修正する。API 側については、設定ファイルから取得するように修正する。Web 側については、環境変数から取得するように修正する。
