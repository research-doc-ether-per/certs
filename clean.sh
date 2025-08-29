Issuer は Issuer Keycloak で証明書 Offer を発行し、その際 Issuer Keycloak の userId を使用しています。
Wallet-Web は Wallet Keycloak でログインしているため、2つの Keycloak の userId が一致せず、発行可能な証明書 Offer を取得できません。
この場合、2つの Keycloak 間で Federation 設定が必要でしょうか？
