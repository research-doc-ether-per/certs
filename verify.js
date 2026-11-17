# 証明書検証

## API概要

**API名：** 証明書検証

**URL：** `/vc/wallets/{リソースID}/verify`

**メソッド：** 旧式様書の定義を踏襲

**概要：**

リソースIDをキーにVCウォレットテーブルから証明書情報を取得し、対象ユーザーの個人ウォレットに保存されている証明書をwalt.id Wallet APIから取得する。

取得した証明書のフォーマット、存在性、失効状態、Issuer署名および有効期限を検証し、検証結果を返却する。

## リクエスト

**パスパラメータ：**

- リソースID（rsId）

**リクエストボディ：**

なし

## レスポンス

| プロパティ | 説明 | 型 |
|---|---|---|
| certData | デコードした証明書ペイロード | object |
| disclosedClaims | SD-JWTのDisclosure情報。存在しない場合はnull | Array / null |
| certName | 証明書の表示名称 | string / null |
| issuerName | Issuerの表示名称。現行処理ではnull | string / null |
| isCorrectFormat | フォーマット検証結果 | boolean |
| credentialExists | 証明書存在確認結果 | boolean |
| isNotRevoked | 失効状態検証結果 | boolean |
| issuerSignatureValid | Issuer署名検証結果 | boolean |
| isNotExpired | 有効期限検証結果 | boolean |
| fields | 証明書の表示用フィールド定義 | Array<object> |

## 処理内容

VC利用API認証処理を実施する。

共通処理「VC利用API認証」参照。

————————

リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合、RequireParamsNotFoundErrorを返却する。

————————

リソースIDをキーにVCウォレットテーブル（vc_wallets）から証明書情報を取得する。

■検索条件

- rs_id：リソースID

■取得情報

- ownerId
- waltidCredentialId
- hash
- certName

対象レコードが存在しない場合、CertificateNotFoundErrorを返却する。

————————

Realm名に応じて、証明書の所有者IDから対象ユーザーIDを取得する。

取得したユーザーIDをキーに個人ウォレット情報を取得する。

個人ウォレットが存在しない場合、WalletNotFoundErrorを返却する。

■取得情報

- walt.idウォレットID

————————

walt.id Wallet APIから対象証明書を取得する。

■エンドポイント

`GET /wallet/{walletId}/credentials/{waltidCredentialId}`

取得した証明書フォーマットに応じて、検証対象の署名済み証明書を取得する。

- SD-JWT VCの場合：signedWithDisclosures
- 上記以外の場合：signed

————————

取得したJWTまたはSD-JWTをデコードする。

■取得情報

- JWTヘッダ
- JWTペイロード
- 署名対象JWT
- Disclosure情報
- 証明書フォーマット

ペイロードにvcが存在する場合、vcを証明書本体として使用する。

上記以外の場合、ペイロードを証明書本体として使用する。

————————

検証結果を初期化する。

■初期値

- certName：VCウォレットテーブルから取得した証明書名称
- issuerName：null
- certData：{}
- fields：[]
- disclosedClaims：null
- isCorrectFormat：false
- credentialExists：false
- isNotRevoked：false
- issuerSignatureValid：false
- isNotExpired：false

————————

証明書のIssuer DIDからグループIDを取得する。

証明書フォーマット、typeおよびvctから証明書タイプを取得する。

取得したグループID、証明書タイプおよび証明書フォーマットをキーに、証明書フォーマット定義テーブル（credential_formats）から表示用フィールド定義を取得する。

指定グループの定義が存在しない場合、グループID「all」の定義を取得する。

取得したフィールド定義をfieldsに設定する。

定義が存在しない場合、または取得に失敗した場合、空配列とする。取得に失敗しても証明書検証を継続する。

————————

デコードした証明書ペイロードをcertDataに設定する。

Disclosure情報が存在する場合、disclosedClaimsに設定する。

存在しない場合、nullを設定する。

————————

証明書のフォーマット検証を実施する。

■日時チェック対象

- issuanceDate
- expirationDate

■必須項目チェック対象

- issuanceDate
- issuer
- credentialSubject.id

日時形式および必須項目のチェック結果がすべて正常の場合、isCorrectFormatにtrueを設定する。

上記以外の場合、falseを設定する。

————————

証明書の存在確認を実施する。

証明書のcredentialSubjectをJSON文字列に変換し、SHA-256ハッシュ値を算出する。

算出したハッシュ値に「0x」を付加し、VCウォレットテーブルから取得したhashと比較する。

■判定条件

- ハッシュ値が一致する場合：credentialExists = true
- ハッシュ値が一致しない場合：credentialExists = false

————————

証明書の失効状態検証を実施する。

証明書のcredentialStatusの先頭要素を取得する。

credentialStatusが存在する場合、以下の情報を使用して失効状態を確認する。

- statusListCredential
- statusListIndex
- statusPurpose

————————

statusListCredentialに指定されたURLからステータスリスト情報を取得する。

HTTPステータスコードが200であり、レスポンスデータが空でないオブジェクトであることを確認する。

取得したステータスリストのstatusPurposeと証明書のstatusPurposeを確認する。

指定されたstatusPurposeが取得した値と一致せず、かつ「revocation」でもない場合、失効状態検証NGとする。

————————

ステータスリストのencodedListをBase64URL形式からデコードし、gzip形式のデータを展開する。

statusListIndexをもとに対象ビットを取得し、失効状態を判定する。

■判定条件

- 対象ビットが0の場合：isNotRevoked = true
- 対象ビットが1の場合：isNotRevoked = false

ステータスリストの取得、デコードまたは判定でエラーが発生した場合、falseを設定する。

————————

credentialStatusが存在しない場合、isNotRevokedにfalseを設定する。

————————

Issuer署名検証を実施する。

Issuer DIDからDID Document取得用URLを生成する。

Issuer DIDはdid:web形式を対象とする。

■取得先

- パスなし：`{scheme}://{host}/.well-known/did.json`
- パスあり：`{scheme}://{host}/{path}/did.json`

開発環境でローカルまたはプライベートネットワークの場合はhttp、それ以外の場合はhttpsを使用する。

————————

DID Documentを取得し、以下を確認する。

- HTTPステータスコードが200であること。
- DID DocumentのidがIssuer DIDと一致すること。
- verificationMethodの先頭要素のidがJWTヘッダのkidと一致すること。
- publicKeyJwkが存在すること。

取得した公開鍵JWKを使用してJWT署名を検証する。

■判定条件

- 署名検証成功：issuerSignatureValid = true
- 署名検証失敗：issuerSignatureValid = false

DID Documentの取得または署名検証でエラーが発生した場合、falseを設定する。

————————

証明書の有効期限検証を実施する。

expirationDateをUTC日時で判定する。

■判定条件

- 有効期限内の場合：isNotExpired = true
- 有効期限切れの場合：isNotExpired = false

————————

検証結果をレスポンスとして返却する。

処理中にエラーが発生した場合、上位処理へエラーを送出する。
