### 4.2.4 Authorization Code Flow の Callback URL について

v0.15.1 と v1.0.0 では、Callback 処理および Callback URL が以下のように変更されています。

| バージョン | Callback URL | 対応 |
| --- | --- | --- |
| v0.15.1 | `http://10.0.2.15:7002/callback` | 正常に Callback 処理を行うため、walt.id のソースコードを一部修正する必要があります。 |
| v1.0.0 | `http://10.0.2.15:7005/openid4vci/external/oauth/callback` | walt.id のソースコードを修正する必要はありません。 |
