// jwk_to_sec1.js
import fs from "fs";
import forge from "node-forge";

// 1. JWK をロード
const jwk = JSON.parse(fs.readFileSync("certs/holder/holder-jwk.json", "utf8"));

// 2. 必要であれば P-256 かチェック
if (jwk.kty !== "EC" || jwk.crv !== "P-256") {
  console.error("Error: JWK が EC P-256 ではありません。");
  process.exit(1);
}

// 3. 関数: Base64URL 文字列 → バイナリ配列
function base64urlToBytes(base64url) {
  // パディングを復元して通常の Base64 に
  let b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64");
}

// 4. JWK の x,y を BN (BigInteger) に変換
const xBytes = base64urlToBytes(jwk.x);
const yBytes = base64urlToBytes(jwk.y);
const dBytes = base64urlToBytes(jwk.d);

// 5. node-forge 用の BigInteger に変換
const xBigInt = new forge.jsbn.BigInteger(xBytes.toString("hex"), 16);
const yBigInt = new forge.jsbn.BigInteger(yBytes.toString("hex"), 16);
const dBigInt = new forge.jsbn.BigInteger(dBytes.toString("hex"), 16);

// 6. EC キーオブジェクトを構築 (prime256v1 = P-256)
const ec = forge.pki.ec;
const ecParams = ec.getCurve("prime256v1");

// 7. 鍵ペア生成
const privateKey = ec.privateKeyFromBigInteger(dBigInt, ecParams);
const publicKey = ecParams.multiply(ecParams.G, dBigInt);

// 8. node-forge で PEM (SEC1) にエクスポート
const privatePem = forge.pki.privateKeyToPem(privateKey);
const publicPem = forge.pki.publicKeyToPem(publicKey);

// 9. ファイルに保存
fs.writeFileSync("certs/holder/did-abc123/leaf.key.pem", privatePem, "utf8");
fs.writeFileSync("certs/holder/did-abc123/leaf.pub.pem", publicPem, "utf8");

console.log("✅ JWK → SEC1 PEM（EC PRIVATE/EC PUBLIC） を作成しました");
