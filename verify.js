./gradlew \
    --no-configuration-cache \
    -Dhttps.proxyHost=172.31.8.51 \
    -Dhttps.proxyPort=8080 \
    -Dhttp.proxyHost=172.31.8.51 \
    -Dhttp.proxyPort=8080 \
    :waltid-services:waltid-wallet-api2:jibDockerBuild \
    -Djib.to.image=waltid/wallet-api2:stable \
    --stacktrace


### `vc_info`

`vc_info.tables` に、Credential Offer情報の移行対象となるテーブルと列を指定します。

`vc_info` に保存されている旧バージョン（walt.id v0.15.1）のデータを、walt.id v1.0.0のCredential Offer作成用データ形式に変換します。

**変換ルール**

対象テーブルから`vc_info`を含むレコードの全カラムを取得します。`vc_info`のJSONデータを解析し、取得したレコード情報を参照して変換します。

1. Credential Configuration IDの変換
   - 移行元データに`credentialConfigurationId`が存在する場合は、その値を取得します。
   - `credentialConfigurationId`の末尾が`_vc+sd-jwt`の場合は、`_dc+sd-jwt`に変換します。
   - その他のCredential Configuration IDは変更しません。
2. Credential Profileの取得
   - 変換後の`credentialConfigurationId`を使用して、walt.id Issuer2から対応するCredential Profileを取得します。
   - 対応するCredential Profileが存在しない場合は、エラーとします。
3. Mappingの変換
   - 取得したCredential Profileの`mapping`を複製します。
   - 複製した`mapping`から`issuanceDate`および`expirationDate`を削除します。
   - その他のMapping情報は保持します。
4. Credential Offer作成用データの生成
   - `profileId`：取得したCredential Profileの`profileId`
   - `authMethod`：旧認証方式をwalt.id v1.0.0形式に変換した値
     - `PRE_AUTHORIZED` → `PRE_AUTHORIZED`
     - `PWD` → `AUTHORIZED`
     - 認証方式の大文字・小文字は区別しません。
   - `valueMode`：`BY_REFERENCE`
   - `mapping`：変換後のMapping
   - `credentialData`：Credential Profileおよび移行元データから生成した証明書情報
5. Credential Offer URLの有効期間
   - 対象レコードの`credential_offer_url`および`credential_offer_expiration_seconds`がいずれもNULL以外の場合は、`expiresInSeconds`に有効期間（秒）を設定します。
   - いずれかがNULLの場合は、`expiresInSeconds`を設定しません。
6. Credential Dataの変換
   - `issuer`には、Credential Profileの`credentialData.issuer`を設定します。
   - 移行元の`credentialData.type`が存在する場合は、`type`を設定します。
   - 移行元の`credentialData.@context`が存在する場合は、`@context`を設定します。
   - `credentialSubject`を以下の形式に変換します。
     - `id`には、Credential Profileの`credentialData.id`を設定します。
     - 移行元の`credentialData.credentialSubject`が存在する場合は、その項目を`credentialSubject`内に展開します。
   - 移行元の`credentialData.issuanceDate`が存在する場合は、`issuanceDate`を設定します。
   - 移行元の`credentialData.expirationDate`が存在する場合は、`expirationDate`を設定します。
7. Selective Disclosureの設定
   - 変換後のCredential Configuration IDの末尾が`_dc+sd-jwt`の場合は、移行元の`selectiveDisclosure`を設定します。
   - その他の証明書フォーマットでは、`selectiveDisclosure`を設定しません。


**DB更新**

- 変換後のデータを`vc_info`に設定します。
- 変換前後のJSONデータに変更がある場合のみDBを更新します。
- 変更がない場合は更新しません。
- DRY RUNでは変換結果を確認し、トランザクションをロールバックします。
- `--apply`を指定した場合は、変更対象のレコードを更新し、正常終了時にコミットします。

**注意事項**

- Credential Profileの取得には、walt.id Issuer2への接続が必要です。
- `credentialConfigurationId`が存在しない場合は、元のデータを返却し、変換しません。
- 対応するCredential Profileが取得できない場合はエラーとし、実行中のトランザクションをロールバックします。
- Credential Offer URLが設定されている場合は、対象レコードに保存されている有効期間（秒）を使用します。URLが未設定の場合は、管理者が事前登録した追加可能証明書情報として扱い、`expiresInSeconds`を設定しません。
- 旧バージョンの`PWD`は、新バージョンの`AUTHORIZED`に変換します。いずれも本システムでは認可コードフローとして扱います。
- Issuer DIDおよびIssuer KeyはCredential Profileの設定を使用するため、移行時には上書きしません。
- Credential StatusはData Function Webhookを使用して設定するため、移行時には設定しません。管理者が事前登録した追加可能証明書については、Wallet APIでCredential Offerを発行する際に設定します。
- 既に新形式へ変換済みのデータは、`credentialConfigurationId`が存在しないため再変換しません。また、変換前後のJSONデータに変更がない場合は、DBを更新しません。


// 既に変換済みのデータは処理しない
if (!value?.credentialConfigurationId) {
    logger.debug('Credential Configuration ID is missing. Skip migration.')
    return value
}


