// 必要なライブラリをインポート
const base64 = require('base64url');
const CBOR = require('cbor');

// 変換関数
function credentialToHex(credentialBase64) {
    // 1. Base64URL をデコードしてバイナリに
    const cborBuffer = base64.toBuffer(credentialBase64);

    // 2. CBOR をデコードしてオブジェクトに
    const cborObject = CBOR.decode(cborBuffer);

    // 3. CBOR オブジェクトを再びバイナリにエンコード
    const reencodedCbor = CBOR.encode(cborObject);

    // 4. バイナリを HEX 文字列に変換
    const hexString = reencodedCbor.toString('hex');

    return hexString;
}

// 例の Base64URL エンコードされた credential
const exampleCredential = 'oWJ...（省略）';

// HEX 形式に変換
const hexResult = credentialToHex(exampleCredential);
console.log(hexResult);

function hexToCredential(hexString) {
    // 1. HEX をバイナリに変換
    const cborBuffer = Buffer.from(hexString, 'hex');

    // 2. CBOR をデコードして元のオブジェクトに
    const cborObject = CBOR.decode(cborBuffer);

    // 3. CBOR をバイナリに再エンコード
    const reencodedCbor = CBOR.encode(cborObject);

    // 4. バイナリを Base64URL にエンコード
    const base64Url = base64.encode(reencodedCbor);

    return base64Url;
}

// 例の HEX 文字列
const exampleHex = 'a1b2c3...（省略）';

// Base64URL 形式に戻す
const credentialBase64 = hexToCredential(exampleHex);
console.log(credentialBase64);
