
### 4.2.4 Authorization Code Flow について
### 4.2.4·1 認可サーバーの Callback URL の設定について
v0.15.1 と v1.0.0 では、Callback 処理および Callback URL が以下のように変更されています。

| バージョン | Callback URL                                               | 対応                                                                                 |
|------------|------------------------------------------------------------|--------------------------------------------------------------------------------------|
| v0.15.1    | `http://10.0.2.15:7002/callback`                           | 正常に Callback 処理を行うため、walt.id のソースコードを一部修正する必要があります。 |
| v1.0.0     | `http://10.0.2.15:7005/openid4vci/external/oauth/callback` | walt.id のソースコードを修正する必要はありません。                                   |
### 4.2.4·2 認可サーバーの対応について
v0.15.1 では、useOfferRequest が Authorization Code Flow を処理できないため、Authorization Code 取得後の Token / Nonce 取得、PoP JWT 生成、Credential Request を個別に実装する必要がありました。

v1.0.0 では、Pre-Authorized Code Flow / Authorization Code Flow の両方に対応しており、一括処理 API または個別処理 API（Step-by-Step）を利用して Credential を発行できます。
