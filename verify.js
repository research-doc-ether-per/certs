Keycloak の Web 用 Client 設定を確認し、ユーザーのロールに応じて Valid Redirect URIs、Root URL、Home URL を設定しました。
また、一部 Client で不足していた Valid Post Logout Redirect URIs も追加しました。
上記対応後、ログアウト時の invalid redirect URL は発生しなくなりました。
