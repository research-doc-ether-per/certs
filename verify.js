
調査したところ、Keycloak の IdP Broker 機能では、外部 IdP 側の group / realm role / client role は、ログイン先 Realm の token へ自動的には引き継がれないようです。

そのため、現状では IdP Mapper を使用して固定的にマッピングする方法で対応する必要があります。
