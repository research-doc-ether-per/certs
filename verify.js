
一括処理 API では、Step-by-Step 版で個別に実行する Access Token 取得、Nonce 取得、Credential Proof 生成、Credential 取得・保存などの処理を Wallet2 内部でまとめて実行します。
| 処理                       | Pre-Authorized                                | Authorization Code                   |
| ------------------------ | --------------------------------------------- | ------------------------------------ |
| Credential Profile 取得・確認 | `GET /issuer2/profiles/{profileId}`           | `GET /issuer2/profiles/{profileId}`  |
| ↓                        | ↓                                             | ↓                                    |
| Credential Offer 作成      | `POST /issuer2/credential-offers`             | `POST /issuer2/credential-offers`    |
| ↓                        | ↓                                             | ↓                                    |
| Credential Offer 解析      | `POST .../resolve-offer`                      | `POST .../resolve-offer`             |
| ↓                        | ↓                                             | ↓                                    |
| Authorization URL 生成     | ―                                             | `POST .../authorization-url`         |
| ↓                        | ↓                                             | ↓                                    |
| User 認証                  | ―                                             | Browser / Keycloak                   |
| ↓                        | ↓                                             | ↓                                    |
| Authorization Code 取得    | ―                                             | Redirect URL                         |
| ↓                        | ↓                                             | ↓                                    |
| Credential 取得・保存         | `POST /wallet/{walletId}/credentials/receive` | `POST .../authorized`                |
| 　├ Access Token 取得       | Wallet2 内部処理                                  | Wallet2 内部処理（Authorization Code を交換） |
| 　├ Nonce 取得              | Wallet2 内部処理                                  | Wallet2 内部処理                         |
| 　├ Credential Proof 生成   | Wallet2 内部処理                                  | Wallet2 内部処理                         |
| 　├ Credential 取得         | Wallet2 内部処理                                  | Wallet2 内部処理                         |
| 　└ Wallet2 保存            | Wallet2 内部処理                                  | Wallet2 内部処理                         |

※ 表中の ... は /wallet/{walletId}/credentials/receive を表します。

一括処理 API では、Credential Offer 解析までの処理は Step-by-Step 版と共通です。

Pre-Authorized Flow では、POST /wallet/{walletId}/credentials/receive により、Pre-Authorized Code を利用した Access Token 取得から Credential の取得・保存までを一括して実行します。

Authorization Code Flow では、Authorization URL の生成およびブラウザ認証後、POST /wallet/{walletId}/credentials/receive/authorized により、Authorization Code の交換から Credential の取得・保存までを一括して実行します。
