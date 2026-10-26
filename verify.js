# Cloud Wallet での Account・Wallet・DID 情報管理について
## 設計方針

Cloud Wallet では、現在、個人 Wallet テーブルに walt.id の `wallet_id` を保持しています。

walt.id では、1つの Account に複数の Wallet を持つことができます。一方、現在の Cloud Wallet では、1つの Account に対して1つの Wallet を使用しています。

現状では `account_id` を保持しなくても問題ありませんが、将来、1つの Account で複数の Wallet を持つ可能性に備えて、個人 Wallet テーブルに `account_id` を追加しておく方がよいと考えます。

## 対応案

- 個人 Wallet テーブルに `account_id` を追加  
  将来、複数 Wallet に対応しやすくするため、`account_id` の追加を推奨します。  
  ただし、現在の1 Account・1 Wallet の運用では必須ではありません。

- Wallet 名を追加  
  組織 Wallet では Wallet 名を画面に表示するため、Cloud Wallet 側に Wallet 名を保持するカラムを追加します。

- DID 名を追加  
  個人 Wallet では DID 名の設定・更新機能があるため、Cloud Wallet 側に DID 名を保持するカラムを追加します。

