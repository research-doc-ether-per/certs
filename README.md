## 概要

credentialSubject.credentialInformation 固定の処理を廃止し、Credential Metadata の claims.path に基づいて、証明書発行データおよび証明書詳細表示データを生成するよう修正しました。

## 対応内容

- Credential Metadata の claims.path に従って Credential 発行用 credentialData を生成
- selectiveDisclosure の設定を fieldsFormat および Credential Metadata の claims.path に基づいて生成
- 証明書詳細表示時、Credential Metadata の claims.path に従って証明書データから値を取得
- Credential Metadata の claims と DB fieldsFormat の両方に存在する項目のみを表示対象に変更
- 表示順を Credential Metadata の claims 定義順に統一
- certName、type、image、issuanceDate、expirationDate、docId などのシステム固定項目を詳細情報から除外し、基本情報として表示
