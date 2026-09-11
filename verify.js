## 7.2 確認結果

### 1. Auth 機能の有効化

Auth 機能を有効化しただけでは、`ktor-authnz` Provider の設定が存在しないというエラーが発生し、認証 API を正常に利用できませんでした。
そのため、`wallet-api2` の `Main.kt` に `ktor-authnz` Provider の登録処理を追加し、再ビルド・再起動を行いました。
修正後、ユーザー登録およびログインが正常に動作することを確認しました。

### 2. 認証方式

Wallet2 v1.0.0 の Auth 機能では、Email / Password によるアカウント登録・ログインのみ利用可能です。OIDC によるユーザー認証には対応していません。

### 3. 認証情報と Wallet 情報の管理

Wallet2 では、認証用のアカウント情報と Wallet 関連情報が分けて管理されています。
Email / Password などの認証情報はメモリ上で管理されているため、Wallet API を再起動すると失われます。
一方、Account と Wallet の関連情報、および Wallet 関連データは、デフォルトでは SQLite に保存されています。
