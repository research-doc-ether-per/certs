Keycloak アクセストークンから取得した group 情報および role 情報をもとに、指定された組織ウォレットに対して対象の操作権限を保持しているか確認する。


アクセストークンを検証し、対象 API に必要なアプリケーションロール、および指定された組織ウォレット ID に対する操作権限を保持しているか確認する。

■ 確認対象
・アプリケーションロール
・組織ウォレット ID に対する操作権限

※ Path Parameter の userId を組織ウォレット ID として扱う。
※ 操作権限は「組織ウォレットID_権限コード」の形式で Access Token の roles に設定される。
※ 権限コードは権限設定ファイルから取得する。

以下の場合、エラーを返却する。

・対象 API に必要なアプリケーションロールが不足している場合：AuthServerUnavailableError
・対象 API に必要なアプリケーションロールが設定されていない場合：AuthServerUnavailableError
・Access Token の groups に指定された組織ウォレット ID が存在しない場合：ForbiddenError
・Access Token の roles に必要な操作権限が存在しない場合：ForbiddenError
・指定された権限種別に対応する権限コードが権限設定ファイルに存在しない場合：InvalidParamsError
