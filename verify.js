
const cbor = require('cbor');
const cose = require('cose-js');

/**
 * IssuerAuth を解析して署名を検証する
 * @param {Buffer} issuerAuthCbor - COSE 署名の CBOR データ
 * @returns {Promise} - 検証結果を含む Promise
 */
function verifyIssuerAuth(issuerAuthCbor) {
    return new Promise((resolve, reject) => {
        // 1. CBOR データをデコード
        cbor.decodeFirst(issuerAuthCbor, (err, decoded) => {
            if (err) {
                reject('CBOR のデコードエラー: ' + err);
                return;
            }

            // 2. デコードされた CBOR データをログ
            console.log('デコードされた IssuerAuth:', decoded);

            // 3. cose-js で署名を検証
            // decoded は COSE_Sign1 形式であると仮定
            cose.verify(decoded, null, (err, verified) => {
                if (err) {
                    reject('署名検証エラー: ' + err);
                } else {
                    console.log('署名検証成功:', verified);
                    resolve(verified); // ここで検証結果を返す
                }
            });
        });
    });
}
