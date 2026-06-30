**groupId**
グループID
Credential Offer URL を発行する Issuer が所属するグループIDを指定する。
  
**targets**
証明書を取得可能な対象者のユーザ名リスト
証明書取得対象者として指定されたユーザ名の一覧を指定する。

指定されたユーザが利用可能なウォレットにサインインする際、認証認可サーバで払い出されたアクセストークンの `preferred_username` と一致する文字列を指定する。複数指定できる。

**endpointUrl**
Credential Offer Endpoint のURL部分
証明書を取り込むウォレットを開くための Credential Offer Endpoint のURLを指定する。

個人用の場合のみ指定する。


  **docId**
発行可能証明書ID
取得対象となる発行可能証明書IDを指定する。


  **credentialOfferUrl**
Credential Offer URL
Issuer が発行した Credential Offer URL が指定される。

データが存在しない場合、null が指定される。

**credentialOfferEndpoint**
Credential Offer Endpoint
証明書取得時に使用する Credential Offer Endpoint の URL が指定される。

データが存在しない場合、null が指定される。

  
  
**credentialOfferEndpointName**
Credential Offer Endpoint の表示名
証明書取得時に使用する Credential Offer Endpoint の表示名が指定される。

データが存在しない場合、null が指定される。


**targets**
証明書を取得可能な対象者のユーザ名リスト
証明書取得対象者として指定されたユーザ名の一覧が指定される。

認証認可サーバで払い出されたアクセストークンの `preferred_username` と一致する文字列のリストが指定される。
