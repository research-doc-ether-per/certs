

Waltid Wallet APIのウォレット作成を呼び出し、ウォレットを作成する。
エンドポイント：`/wallet`  
メソッド：POST  
ボディ：なし（デフォルト設定を使用）

【取得情報】
- `walletId`：作成したウォレットID

ウォレットIDが取得できなかった場合、エラーとする。

Waltid Wallet APIのKey生成を呼び出し、作成したウォレットにKeyを生成する。
エンドポイント：`/wallet/{walletId}/keys/generate`  
メソッド：POST  
パラメータ：
- `walletId`：作成したウォレットID

ボディ：
- `backend`：jwk
- `keyType`：secp256r1

【取得情報】
- `keyId`：生成したKeyのID

Key IDが取得できなかった場合、エラーとする。

Waltid Wallet APIのデフォルトKey設定を呼び出し、生成したKeyをウォレットのデフォルトKeyに設定する。
エンドポイント：`/wallet/{walletId}/keys/{keyId}/set-default`  
メソッド：PUT  
パラメータ：
- `walletId`：作成したウォレットID
- `keyId`：生成したKeyのID
ボディ：なし

Waltid Wallet APIのDID作成を呼び出し、生成したKeyを使用してウォレットにDIDを作成する。
エンドポイント：`/wallet/{walletId}/dids/create`  
メソッド：POST  
パラメータ：
- `walletId`：作成したウォレットID
ボディ：
- `method`：jwk
- `keyId`：生成したKeyのID
- `options`：空オブジェクト

【取得情報】
- `did`：作成したDID

DIDが取得できなかった場合、エラーとする。

Waltid Wallet APIのデフォルトDID設定を呼び出し、作成したDIDをウォレットのデフォルトDIDに設定する。
エンドポイント：`/wallet/{walletId}/dids/{did}/set-default`  
メソッド：PUT  
パラメータ：
- `walletId`：作成したウォレットID
- `did`：作成したDID
ボディ：なし

作成したウォレットID、Key IDおよびDIDを呼び出し元の処理で使用する。

エラーが発生した場合、作成済みのWaltidウォレットが存在するときは、当該ウォレットを削除する。
エンドポイント：`/wallet/{walletId}`  
メソッド：DELETE  
パラメータ：
- `walletId`：作成したウォレットID
ボディ：なし

