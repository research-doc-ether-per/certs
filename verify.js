**レスポンスボディ**
DID情報の一覧
指定されたユーザが利用可能なウォレットに紐づく DID 情報が指定される。

**did**
DID識別子
例：did:jwk:xxx、did:key:xxx

**alias**
DIDの表示名

**document**
DID Document の JSON 文字列
公開鍵などの情報を含む JSON 文字列が指定される。

**keyId**
鍵ID
DIDに紐づく公開鍵の識別子が指定される。

**default**
デフォルトフラグ
デフォルト DID かどうかが指定される。

・true：デフォルト
・false：デフォルトではない

**createdOn**
DID作成日時


取得対象の DID を指定する。




**@context**
DID / JWS の仕様定義
DID Document のコンテキスト情報が指定される。

**id**
DID識別子

**verificationMethod**
利用可能な公開鍵の一覧
DID の検証に使用可能な公開鍵情報が指定される。

**assertionMethod**
VC署名用
VC の署名に使用する検証メソッドが指定される。

**authentication**
認証用
認証に使用する検証メソッドが指定される。

**capabilityInvocation**
権限実行用
権限実行に使用する検証メソッドが指定される。

**capabilityDelegation**
権限委譲用
権限委譲に使用する検証メソッドが指定される。

**keyAgreement**
暗号化・鍵共有用
暗号化、または鍵共有に使用する検証メソッドが指定される。
