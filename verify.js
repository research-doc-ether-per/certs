
アクセストークンの azp クレームが、サーバ設定ファイルの keycloak.allowedClients.walletApi と一致し、
かつ uma_protection によるロール権限不足を許可する対象 API の場合、ユーザ種別の判定は行わない。

対象 API：
・証明書ID指定 Credential Offer URL 発行 API

上記以外の場合、アクセストークンの Realm 名を確認し、Issuer 管理者用 Realm 名と一致するか確認する。

以下の場合、エラーを返却する。
・Issuer 管理者用 Realm 名と一致しない場合：InvalidRequestError

また、アクセストークンに対象 API の利用に必要なアプリケーションロールが含まれているか確認する。

保護対象：
・アプリケーションロール「vc-wallet」

ただし、uma_protection によるロール権限不足を許可する対象 API の場合は、ロール権限不足によるエラーは返却せず、後続処理を継続する。

以下の場合、エラーを返却する。
・必要なアプリケーションロールが含まれていない場合：AuthServerUnavailableError
