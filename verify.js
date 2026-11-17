証明書の失効状態検証を実施する。

証明書のcredentialStatusの先頭要素を取得する。

credentialStatusが存在する場合、以下の情報を取得する。
- statusListCredential
- statusListIndex
- statusPurpose
————————

statusListCredentialに指定されたURLからステータスリスト情報を取得する。

HTTPステータスコードが200であり、レスポンスデータが空でないオブジェクトであることを確認する。

statusPurposeについて、証明書に指定された値と取得したステータスリストの値が一致するか、証明書に指定された値が「revocation」であることを確認する。

条件を満たさない場合、失効状態検証NGとする。

————————

取得したencodedListをデコードし、ステータスリストのバイナリデータを取得する。

statusListIndexが0以上の整数であり、ステータスリストのビット長の範囲内であることを確認する。

statusListIndexに対応するビットを取得し、失効状態を判定する。

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

■DID Document取得先
- パスなし：{scheme}://{host}/.well-known/did.json
- パスあり：{scheme}://{host}/{path}/did.json
開発環境でローカルまたはプライベートネットワークの場合はhttp、それ以外の場合はhttpsを使用する。

————————

取得したDID Documentについて、以下を確認する。
- HTTPステータスコードが200であること。
- DID DocumentのidがIssuer DIDと一致すること。
- verificationMethodの先頭要素のidがJWTヘッダのkidと一致すること。
- 公開鍵JWKが存在すること。
取得した公開鍵JWKを使用してJWTの署名を検証する。

■判定条件
- 署名検証成功：issuerSignatureValid = true
- 署名検証失敗：issuerSignatureValid = false
DID Documentの取得または署名検証でエラーが発生した場合、falseを設定する。
