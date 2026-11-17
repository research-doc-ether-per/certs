# 証明書ファイル検証

## 概要

指定された証明書ファイルのJWTまたはSD-JWTをデコードし、証明書情報を取得する。

credentialSubjectのハッシュ値をもとにVCウォレットテーブルから証明書情報を検索し、対象レコードが存在する場合、walt.id Wallet APIで証明書の存在を確認する。

証明書のフォーマット、存在、失効状態、Issuer署名および有効期限を検証し、検証結果を返却する。

## リクエスト

■入力情報

- certJwt：検証対象の証明書JWTまたはSD-JWT

## レスポンス

| 項目名 | 型 | 説明 |
|---|---|---|
| certName | string / null | 証明書表示名称。未登録の場合はnull |
| issuerName | null | nullを設定する |
| certData | object | デコードした証明書のペイロード |
| fields | Array<object> | 証明書の表示用フィールド定義 |
| disclosedClaims | Array / null | Disclosure情報。存在しない場合はnull |
| isCorrectFormat | boolean | フォーマット検証結果 |
| credentialExists | boolean | 証明書の存在およびハッシュ値検証結果 |
| isNotRevoked | boolean | 失効状態検証結果 |
| issuerSignatureValid | boolean | Issuer署名検証結果 |
| isNotExpired | boolean | 有効期限検証結果 |

## 処理内容

VC利用API認証処理を実施する。

共通処理「VC利用API認証」参照。

————————

リクエストパラメータの必須チェックを実施する。

必須情報が存在しない場合、RequireParamsNotFoundErrorを返却する。

————————

リクエストから証明書JWTまたはSD-JWTを取得し、デコードする。

■取得情報

- JWTヘッダ
- JWTペイロード
- 署名対象JWT
- Disclosure情報
- 証明書フォーマット

JWTペイロードにvcが存在する場合、vcを証明書本体として使用する。

上記以外の場合、JWTペイロードを証明書本体として使用する。

————————

証明書本体からcredentialSubjectを取得する。

credentialSubjectが存在する場合、JSON文字列に変換し、SHA-256ハッシュ値を算出する。

算出したハッシュ値に「0x」を付加し、VCウォレットテーブル（vc_wallets）から証明書情報を取得する。

■検索条件

- hash：算出したハッシュ値

■ソート条件

- update_date：降順

■取得件数

- 1件

————————

VCウォレットテーブルから対象レコードを取得できた場合、以下の情報を取得する。

- ownerId
- waltidCredentialId
- hash
- certName

対象レコードが存在しない場合、walt.idへの証明書存在確認を実施せず、後続の証明書検証処理を継続する。

————————

VCウォレットテーブルから対象レコードを取得できた場合、Realm名に応じてownerIdからリクエスト用ユーザー情報を取得する。

取得したユーザーIDをもとに個人ウォレット情報を取得する。

■取得情報

- walt.idウォレットID

————————

取得したwalt.idウォレットIDおよび証明書IDを使用して、walt.id Wallet APIから対象証明書を取得する。

■エンドポイント

GET /wallet/{walletId}/credentials/{waltidCredentialId}

■指定情報

- walletId：取得したwalt.idウォレットID
- waltidCredentialId：VCウォレットテーブルから取得した証明書ID

■判定条件

- 証明書を取得できた場合：証明書が存在するものとする。
- HTTPステータスコードが404の場合：証明書が存在しないものとし、後続処理を継続する。
- 上記以外のエラーの場合：エラーを送出する。

————————

検証結果を初期化する。

■初期値

- certName：VCウォレットテーブルから取得した証明書表示名称。未取得の場合はnull
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

証明書のIssuer DIDをもとにグループIDを取得する。

証明書フォーマット、typeおよびvctから証明書タイプを取得する。

取得したグループID、証明書タイプおよび証明書フォーマットを使用して、証明書フォーマット定義を取得する。

■取得情報

- fields

取得したフィールド定義をfieldsに設定する。

証明書フォーマット定義が存在しない場合、または取得に失敗した場合、空配列を設定する。

取得に失敗した場合は警告ログを出力し、証明書検証処理を継続する。

————————

デコードしたJWTペイロードをcertDataに設定する。

Disclosure情報が存在する場合、disclosedClaimsに設定する。

存在しない場合、nullを設定する。

————————

証明書のフォーマット検証を実施する。

■日時形式チェック対象

- issuanceDate
- expirationDate

■必須属性存在チェック対象

- issuanceDate
- issuer
- credentialSubject.id

日時形式チェックでは、対象項目が有効な日時形式であるか確認する。

必須属性存在チェックでは、指定された属性が証明書本体に存在するか確認する。

日時形式チェックおよび必須属性存在チェックが両方とも正常の場合、isCorrectFormatにtrueを設定する。

上記以外の場合、falseを設定する。

————————

証明書の存在およびハッシュ値検証を実施する。

証明書のcredentialSubjectをJSON文字列に変換し、SHA-256ハッシュ値を算出する。

算出したハッシュ値に「0x」を付加し、VCウォレットテーブルから取得したhashと比較する。

walt.idの証明書存在確認結果とハッシュ値の比較結果からcredentialExistsを判定する。

■判定条件

- VCウォレットテーブルに対象レコードが存在し、walt.idから証明書を取得でき、かつハッシュ値が一致する場合：credentialExists = true
- VCウォレットテーブルに対象レコードが存在しない場合：credentialExists = false
- walt.idから証明書を取得できない場合：credentialExists = false
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

HTTPステータスコードが200であり、レスポンスデータが空でないことを確認する。

statusPurposeの整合性を確認する。

取得したencodedListをデコードし、statusListIndexに対応するビットから失効状態を判定する。

■判定条件

- 対象ビットが0の場合：isNotRevoked = true
- 対象ビットが1の場合：isNotRevoked = false

ステータスリストの取得、デコードまたは判定でエラーが発生した場合、isNotRevokedにfalseを設定する。

————————

credentialStatusが存在しない場合、失効状態検証を実施せず、isNotRevokedにtrueを設定する。

————————

Issuer署名検証を実施する。

証明書のIssuer DIDおよびJWTヘッダのkidをもとに、IssuerのDID Documentを取得する。

Issuer DIDはdid:web形式を対象とする。

取得したDID Documentについて、以下を確認する。

- DID DocumentのidがIssuer DIDと一致すること。
- verificationMethodの先頭要素のidがJWTヘッダのkidと一致すること。
- 公開鍵JWKが存在すること。

取得した公開鍵JWKを使用してJWTの署名を検証する。

■判定条件

- 署名検証成功：issuerSignatureValid = true
- 署名検証失敗：issuerSignatureValid = false

DID Documentの取得または署名検証でエラーが発生した場合、falseを設定する。

————————

証明書の有効期限検証を実施する。

expirationDateをもとに有効期限切れかどうかを判定する。

■判定条件

- 有効期限内の場合：isNotExpired = true
- 有効期限切れの場合：isNotExpired = false

————————

各検証結果、証明書データおよび表示用フィールド定義をレスポンスとして返却する。

処理中にエラーが発生した場合、エラーをログに出力し、上位処理へ送出する。
