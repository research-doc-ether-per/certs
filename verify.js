
## 処理内容

VC利用API認証処理を実施する。

共通処理「VC利用API認証」参照。

————————

パラメータの必須チェックを実施する。

以下の場合、エラーを返却する。

- 必須情報が存在しない場合：RequireParamsNotFoundError

————————

リクエストパラメータから以下の情報を取得する。

- リソースID
- Realm名
- Keycloakユーザー情報
- Keycloakトークン情報

————————

リソースIDをキーにVCウォレットテーブル（vc_wallets）から証明書情報を取得する。

■検索条件

- リソースID（rs_id）：リクエストパラメータのrsId

以下の場合、エラーを返却する。

- VC情報が存在しない場合：CertificateNotFoundError

■取得情報

- 所有者ID：ownerId
- walt.id証明書ID：waltidCredentialId
- クレデンシャルハッシュ：hash
- 証明書表示名称：certName

————————

Realm名に応じて、VC情報の所有者ID（ownerId）から対象ユーザーIDを取得する。

- 個人ユーザーの場合：ownerIdをそのままユーザーIDとして使用する。
- 組織ユーザーの場合：ownerIdからKeycloak Issuer情報を除去し、対象ユーザーIDを取得する。

————————

取得したユーザーIDをキーに個人ウォレットテーブル（priv_wallets）からウォレット情報を取得する。

■検索条件

- ユーザーID：取得したユーザーID

以下の場合、エラーを返却する。

- 個人ウォレットが存在しない場合：WalletNotFoundError

■取得情報

- walt.idウォレットID：waltid_wallet

————————

walt.id Wallet APIの証明書取得処理を呼び出し、証明書情報を取得する。

■エンドポイント

`/wallet/{walletId}/credentials/{waltidCredentialId}`

■メソッド

GET

■指定情報

- ウォレットID：取得したwalt.idウォレットID
- 証明書ID：取得したwalt.id証明書ID

■取得情報

- 証明書フォーマット：credential.format
- 署名済み証明書：credential.signed
- Disclosureを含む署名済み証明書：credential.signedWithDisclosures

————————

証明書フォーマットに応じて、検証対象の証明書JWTを取得する。

- SD-JWT VCの場合：signedWithDisclosuresを使用する。
- 上記以外の場合：signedを使用する。

————————

取得したJWTまたはSD-JWTをデコードし、証明書情報を取得する。

■取得情報

- 証明書フォーマット
- JWTヘッダ
- JWTペイロード
- 署名対象JWT
- Disclosure情報

SD-JWTの場合、JWT部分とDisclosure部分を分離し、それぞれ解析する。

解析に失敗した場合、空のペイロードを設定する。

————————

返却用の検証結果を初期化する。

■初期値

- certName：VCウォレットテーブルから取得した証明書表示名称
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

デコードした証明書ペイロードから証明書本体を取得する。

- payload.vcが存在する場合：payload.vcを使用する。
- 上記以外の場合：payloadを使用する。

証明書本体から以下の情報を取得する。

- credentialSubject
- credentialStatus
- vct
- type
- issuer
- expirationDate

credentialStatusが存在する場合、先頭要素を使用する。

————————

Issuer DIDをキーにIssuerテーブルから発行者情報を取得する。

■検索条件

- DID：証明書のissuer

■取得情報

- Issuer名
- グループID

取得したグループIDを、証明書フォーマット定義の検索に使用する。

————————

証明書フォーマットに応じて証明書タイプを取得する。

■判定情報

- 証明書フォーマット
- 証明書タイプ（type）
- VCT（vct）

取得した証明書タイプを、証明書フォーマット定義の検索に使用する。

————————

証明書フォーマット定義テーブル（credential_formats）から表示用フィールド定義を取得する。

■検索条件（AND条件）

- グループID：Issuer情報から取得したグループID
- 証明書タイプ：取得した証明書タイプ
- 証明書フォーマット：取得した証明書フォーマット

グループIDが存在し、かつ「all」以外の場合、指定されたグループIDで検索する。

対象レコードが存在しない場合、グループIDを「all」に変更して再検索する。

■取得情報

- 証明書フィールド定義：fields

取得したフィールド定義を配列形式に変換し、検証結果のfieldsに設定する。

対象レコードが存在しない場合、空配列を設定する。

フィールド定義の取得に失敗した場合、警告ログを出力し、検証処理を継続する。

————————

証明書データおよびDisclosure情報を検証結果に設定する。

- certData：デコードした証明書ペイロード
- disclosedClaims：デコードしたDisclosure情報

Disclosure情報が存在しない場合、nullを設定する。

————————

証明書のフォーマット検証を実施する。

以下の日時項目について、日時として有効かどうかを確認する。

■日時チェック対象

- issuanceDate
- expirationDate

以下の必須項目について、存在確認を実施する。

■必須項目チェック対象

- issuanceDate
- issuer
- credentialSubject.id

日時チェックと必須項目チェックが両方とも正常の場合、フォーマット検証結果をtrueとする。

上記以外の場合、falseとする。

■検証結果

- OK：isCorrectFormat = true
- NG：isCorrectFormat = false

————————

証明書の存在確認を実施する。

証明書のcredentialSubjectをJSON文字列に変換し、SHA-256ハッシュ値を取得する。

取得したハッシュ値に「0x」を付加し、VCウォレットテーブルから取得したハッシュ値と比較する。

■判定条件

- ハッシュ値が一致する場合：true
- ハッシュ値が一致しない場合：false

VCウォレットテーブルから取得したハッシュ値が存在しない場合、証明書ファイル検証であり、かつ対象証明書が登録されていない場合に限り、trueとする。

■検証結果

- OK：credentialExists = true
- NG：credentialExists = false

————————

証明書の失効状態検証を実施する。

証明書にcredentialStatusが存在するかどうかを確認する。

- credentialStatusが存在する場合：Credential Statusによる失効状態検証を実施する。
- credentialStatusが存在しない場合：walt.idデータベースによる失効状態検証を実施する。

————————

【credentialStatusが存在する場合】

credentialStatusから以下の情報を取得する。

- ステータスリストURL：statusListCredential
- ステータスリストインデックス：statusListIndex
- ステータス用途：statusPurpose

statusListIndexを数値に変換する。

数値が不正、または0未満の場合、失効状態検証NGとする。

————————

ステータスリストURLに対してGETリクエストを実行し、ステータスリスト情報を取得する。

以下の条件を確認する。

- HTTPステータスコードが200であること。
- レスポンスデータがオブジェクトであること。
- レスポンスデータが空でないこと。

上記条件を満たさない場合、失効状態検証NGとする。

————————

取得したステータスリスト情報から以下を取得する。

- ステータス用途：credentialSubject.statusPurpose
- エンコード済みステータスリスト：credentialSubject.encodedList

ステータス用途を確認する。

指定されたstatusPurposeが取得したstatusPurposeと一致しない場合、指定されたstatusPurposeが「revocation」であるか確認する。

いずれにも該当しない場合、失効状態検証NGとする。

————————

取得したencodedListをデコードする。

- 先頭が「u」の場合、先頭文字を除去する。
- Base64URL形式からバイナリデータに変換する。
- gzip形式のデータを展開する。

デコードに失敗した場合、失効状態検証NGとする。

————————

デコードしたステータスリストから対象インデックスの失効状態を取得する。

ステータスリストのビット長を確認し、statusListIndexが範囲外の場合、失効状態検証NGとする。

対象インデックスのバイト位置およびビット位置を算出し、MSB-first方式で対象ビットを確認する。

■判定条件

- 対象ビットが0の場合：失効していない。
- 対象ビットが1の場合：失効している。

■検証結果

- OK：isNotRevoked = true
- NG：isNotRevoked = false

ステータスリストの取得、デコードまたは失効状態の判定でエラーが発生した場合、falseとする。

————————

【credentialStatusが存在しない場合】

walt.id証明書IDが存在する場合、walt.idデータベースのcredentialsテーブルから証明書情報を取得する。

■検索条件（AND条件）

- ウォレットID（wallet）：取得したwalt.idウォレットID
- 証明書ID（id）：取得したwalt.id証明書ID
- 削除日時（deleted_on）：null

■判定条件

- 取得レコードが1件の場合：失効していない。
- 取得レコードが0件または複数件の場合：失効している。

ただし、証明書ファイル検証の場合、取得レコードが0件であっても失効していないと判定する。

walt.id証明書IDが存在しない場合、証明書ファイル検証であり、かつ対象証明書が登録されていない場合に限り、失効していないと判定する。

■検証結果

- OK：isNotRevoked = true
- NG：isNotRevoked = false

データベース検索中にエラーが発生した場合、falseとする。

————————

Issuer署名検証を実施する。

証明書から以下の情報を取得する。

- Issuer DID：issuer
- 検証メソッドID：JWTヘッダのkid
- 署名対象JWT

Issuer DIDをもとにDID Document取得用URLを生成する。

Issuer DIDは「did:web:」形式を対象とする。

DID文字列からホスト名、ポート番号およびパス情報を取得する。

■通信スキーム

- 開発環境、かつローカルまたはプライベートネットワークの場合：http
- 上記以外の場合：https

■DID Document取得先

パス情報が存在しない場合：

`{scheme}://{host}/.well-known/did.json`

パス情報が存在する場合：

`{scheme}://{host}/{path}/did.json`

————————

生成したURLにGETリクエストを実行し、IssuerのDID Documentを取得する。

以下の条件を確認する。

- HTTPステータスコードが200であること。
- DID Documentがオブジェクトであること。
- DID DocumentのidがIssuer DIDと一致すること。
- verificationMethodの先頭要素のidがJWTヘッダのkidと一致すること。
- verificationMethodの先頭要素にpublicKeyJwkが存在すること。

条件を満たさない場合、Issuer署名検証NGとする。

————————

DID Documentから取得した公開鍵JWKを使用して署名検証を実施する。

公開鍵JWKのcrvから署名アルゴリズムを取得する。

公開鍵JWKをインポートし、JWTの署名を検証する。

■検証結果

- OK：issuerSignatureValid = true
- NG：issuerSignatureValid = false

公開鍵の取得または署名検証でエラーが発生した場合、falseとする。

————————

証明書の有効期限検証を実施する。

証明書のexpirationDateを取得し、現在のUTC日時と比較する。

■判定条件

- 有効期限が切れていない場合：true
- 有効期限が切れている場合：false

■検証結果

- OK：isNotExpired = true
- NG：isNotExpired = false

————————

Issuerの表示名称を設定する。

現行処理ではIssuer名を取得しているが、検証結果のissuerNameには設定していないため、nullを返却する。

————————

検証結果をレスポンスとして返却する。

■返却情報

- certData
- disclosedClaims
- certName
- issuerName
- isCorrectFormat
- credentialExists
- isNotRevoked
- issuerSignatureValid
- isNotExpired
- fields

————————

処理中にエラーが発生した場合、エラー内容をログに出力し、上位処理へ送出する。

HTTPステータスコードおよびエラーレスポンスは、API側のエラーハンドリングに従う。
