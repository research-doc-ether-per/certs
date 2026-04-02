// grantType：付与種別。Credential発行時に使用する認可フローの種別を表す（pre-authorized code または authorization code）。
// clientId：リクエスト元のクライアントID。認可サーバ（例：Keycloak）に登録されたクライアントを識別する。
// did：署名に使用するDID。Credential発行時にIssuerとして利用する分散ID。
// vct：Credential Offerから取得した証明書タイプ識別子（vct）。
// state：Issuerの認可処理で払い出されたstate値。リクエストとレスポンスの対応付けに使用する。
// code：Issuerの認可処理で払い出された認可コードまたはアクセストークン。
// preAuthorizedCode：Credential Offerから取得したpre-authorized code。事前認可フローで使用する。
// credentialIssuer：Credential Offerから取得したcredential issuer。証明書発行エンドポイントを示すURL。
// format：Credential Offerから取得した証明書フォーマット種別（例：jwt_vc_json、vc+sd-jwt）。
// certName：Credential Offerから取得した証明書名称（表示用名称）。
// docId：Credential Offerから取得したdocId。証明書テンプレートまたは定義を識別するID。
// imageUrl：Credential Offerから取得した画像URL。証明書に関連付けられた表示用画像のURL。
// credentialDefinition：証明書定義情報。証明書の構造や項目定義を含むオブジェクト。
// credentialDefinition.type：証明書の種別一覧。証明書タイプを表す配列。

// list：Presentation RequestのURL情報一覧。Verifierからの提示要求URL情報を複数件保持する配列。
// id：Presentation Request URLの識別子。各URLを一意に識別するID。
// groupId：グループID。関連するPresentation Request URLを同一グループとして管理するための識別子。
// presentationRequestUrl：Presentation RequestのURL。Verifierからの証明書提示要求にアクセスするためのURL。
// type：証明書の種別。提示要求の対象となる証明書の種類を表す。
// format：証明書のフォーマット種別。提示対象の証明書形式（例：jwt_vc_json 等）を表す。
// name：Verifierの名称。Presentation Requestを発行した検証者の表示名。
// updateDate：更新日時（Unixエポック秒）。当該データが最後に更新された時刻。
// createDate：作成日時（Unixエポック秒）。当該データが作成された時刻。
// // 

// url：Presentation RequestのURL。Verifierからの提示要求を解決するためのURL。

// selectedCredentials：提示対象となる証明書IDのリスト。Presentation Requestの条件に一致した証明書を識別する。

// disclosures：提示対象証明書IDとdisclosure情報の対応関係。各証明書に対して開示するクレーム情報を管理する。

// disclosures.{証明書ID}：指定された証明書IDに紐づくdisclosureリスト。選択的開示されるクレーム情報を表す。

// rsIds：プレゼンテーション定義に一致する証明書のCWリソースID一覧。提示処理に利用する内部識別子。

// groupId：グループID。関連するPresentation Requestまたは証明書を同一グループとして識別するためのID。

// // 
// presentationRequest：Presentation Requestの内容。Verifierから要求された提示条件を含むリクエスト情報。

// selectedCredentials：提示対象となる証明書IDのリスト。Presentation Requestの条件に基づき選択された証明書を指定する。

// disclosures：証明書IDとdisclosure情報の対応関係。各証明書ごとに開示するクレーム情報を管理する。

// disclosures.{証明書ID}：指定された証明書IDに対応するdisclosureリスト。選択的開示されるクレーム（属性）情報を表す。

// groupId：提示先VerifierのグループID。Presentation Requestの送信先を識別するためのID。
