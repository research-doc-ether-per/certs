### Auth 関連 API

Wallet2 v1.0.0 では、Email / Password による認証に以下の API が提供されています。

| Method | API | 説明 |
|---|---|---|
| `POST` | `/auth/register` | Email / Password で新しいアカウントを登録する。 |
| `POST` | `/auth/emailpass` | Email / Password でログインし、Access Token を取得する。 |
| `POST` | `/auth/logout` | ログアウトする。 |
| `GET` | `/auth/account` | 認証済みアカウントの情報を取得する。 |
| `GET` | `/auth/account/wallets` | 認証済みアカウントに紐づく Wallet の一覧を取得する。 |
| `GET` | `/auth/account/wallets/{walletId}` | 指定した Wallet が認証済みアカウントに紐づいているか確認する。 |
