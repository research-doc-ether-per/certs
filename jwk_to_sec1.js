// generate_leaf_and_cwt.js

import fs from "fs";
import cbor from "cbor";
import * as cose from "cose-js";
import jose from "jose";
import pem from "pem"; // npm install pem

// ----------------------------------------------------------------------------
// 0. 配置区域：
// ----------------------------------------------------------------------------

// Holder JWK 文件路径（Wallet-API 导出的那把 EC P-256 JWK）
const HOLDER_JWK_PATH = "certs/holder/holder-jwk.json";

// Holder DID，要和证书里放的 SAN 一致
const HOLDER_DID = "did:example:holder-abc123";

// 中间 CA 的私钥/证书路径（由 create_issuer_ca.sh 生成）
const INTERMEDIATE_KEY_PATH = "certs/issuer/intermediate/intermediate.key.pem";
const INTERMEDIATE_CERT_PATH = "certs/issuer/intermediate/intermediate.pem";

// 根 CA 证书路径（由 create_issuer_ca.sh 生成）
const ROOT_CERT_PATH = "certs/issuer/root/root.pem";

// CWT 的 Issuer URI（OID4VCI 发证端点）
const ISSUER_URI =
  "https://issuer.example.com/realms/ExampleRealm/protocol/oid4vc/credential";

// ----------------------------------------------------------------------------
// 1. 辅助函数：PEM → DER（Buffer）
// ----------------------------------------------------------------------------
function pemToDer(pemFilePath) {
  const pem = fs.readFileSync(pemFilePath, "utf8");
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  return Buffer.from(b64, "base64");
}

// ----------------------------------------------------------------------------
// 2. 生成 Leaf 证书（由中间 CA 签发，SAN 包含 HOLDER_DID）
// ----------------------------------------------------------------------------
async function generateLeafCertByIntermediate(jwk, holderDid) {
  // 2.1 用 jose.importJWK 把 JWK 导入为可用于 ES256 的 privateKey 对象
  const privateKeyObj = await jose.importJWK(jwk, "ES256");

  // 2.2 导出成 PKCS#8 PEM 文本（-----BEGIN PRIVATE KEY-----）
  const privatePemPkcs8 = await jose.exportPKCS8(privateKeyObj);

  // 2.3 用 pem.createCertificate 让「中间 CA」签发一张 Leaf 证书
  const certAndKeys = await new Promise((resolve, reject) => {
    pem.createCertificate(
      {
        selfSigned: false, // 由中间 CA 签发
        // 指定“中间 CA 私钥 / 中间 CA 证书”，pem 会用这对来签发 Leaf
        serviceKey: fs.readFileSync(INTERMEDIATE_KEY_PATH, "utf8"),
        serviceCertificate: fs.readFileSync(INTERMEDIATE_CERT_PATH, "utf8"),
        // Leaf 证书的 Subject CN
        commonName: "holder",
        // 在 SAN 放入 Holder DID
        altNames: [`URI:${holderDid}`],
        // 证书有效期（单位：天）
        days: 365,
        // 由于我们自己传了服务端私钥（中间 CA 私钥），pem 会跳过自签过程，直接给出 Leaf
        // 证书。如果出现 “CA:TRUE” 的限定，也可以在这里传 ca:true/false 之类的选项，pem 文档中有说明
      },
      (err, keys) => {
        if (err) return reject(err);
        resolve(keys);
      }
    );
  });

  // certAndKeys 里会包含：
  //   keys.certificate         => Leaf 证书 PEM (-----BEGIN CERTIFICATE-----)
  //   keys.serviceKey          => 中间 CA 私钥 PEM（同输入）
  //   keys.clientKey           => Leaf 私钥 PEM（SEC1 格式, -----BEGIN EC PRIVATE KEY-----）
  //   keys.clientKeyPassphrase => （如果设置了 passphrase）
  //   keys.csr                  => 如果同时生成了 CSR，这里也会包含
  //
  // 但我们关心的是：
  //   keys.certificate  → Leaf 证书
  //   keys.clientKey    → Leaf 私钥，用于 CWT 签名
  //
  return {
    leafCertPem: certAndKeys.certificate,
    leafKeyPem: certAndKeys.clientKey,
  };
}

// ----------------------------------------------------------------------------
// 3. 生成 CWT（COSE_Sign1），并把 Leaf/Intermediate/Root 放入 x5chain
// ----------------------------------------------------------------------------
async function createCwtWithX5chain(jwk, holderDid, leafKeyPem) {
  // 3.1 构造 Holder 的 COSE key 对象
  //    我们已经有了 JWK 原文，因此直接把 x/y/d 解码为 Buffer
  const xBuf = Buffer.from(jwk.x, "base64url");
  const yBuf = Buffer.from(jwk.y, "base64url");
  const dBuf = Buffer.from(jwk.d, "base64url");

  const holderCoseKey = {
    kty: "EC",
    kid: Buffer.from("holder-key-id"), // 这里可以自定义一个唯一标识
    alg: "ES256",
    crv: "P-256",
    x: xBuf,
    y: yBuf,
    d: dBuf,
  };

  // 3.2 构建 CWT Payload
  const payload = {
    iss: holderDid,
    aud: ISSUER_URI,
    nonce: "<这里填从 Issuer /prepare 拿到的 challenge>",
    iat: Math.floor(Date.now() / 1000),
  };
  const cborPayload = cbor.encode(payload);

  // 3.3 把 Leaf / Intermediate / Root PEM → DER(Buffer)
  const leafDer = pemToDer("certs/issuer/leaf/leaf.pem");
  const interDer = pemToDer(INTERMEDIATE_CERT_PATH);
  const rootDer = pemToDer(ROOT_CERT_PATH);

  // 3.4 构造 COSE Header：Protected 部分写 alg，Unprotected 部分写 x5chain
  const headers = {
    p: { alg: "ES256" },
    u: { x5chain: [leafDer, interDer, rootDer] },
  };

  // 3.5 用 Holder 私钥（COSE Key）对 CBOR Payload 做签名，创建 COSE_Sign1
  const cwtBinary = await cose.sign.create(headers, cborPayload, holderCoseKey);

  return cwtBinary; // Uint8Array
}

// ----------------------------------------------------------------------------
// 4. 主函数：连贯调用 2 & 3，并输出最终的 Base64URL CWT
// ----------------------------------------------------------------------------
async function main() {
  // 4.1 读取 Holder JWK
  const jwk = JSON.parse(fs.readFileSync(HOLDER_JWK_PATH, "utf8"));

  // 4.2 生成 Leaf 证书（由中间 CA 签发），返回 { leafCertPem, leafKeyPem }
  console.log("▶ 正在生成由中間 CA 署名の Leaf 証明書...");
  const { leafCertPem, leafKeyPem } = await generateLeafCertByIntermediate(
    jwk,
    HOLDER_DID
  );
  // 把生成的 Leaf PEM 写入磁盘（可选）
  fs.writeFileSync("certs/issuer/leaf/leaf.pem", leafCertPem, "utf8");
  fs.writeFileSync("certs/issuer/leaf/leaf.key.pem", leafKeyPem, "utf8");
  console.log("✅ Leaf 証明書 を certs/issuer/leaf/leaf.pem に保存しました");

  // 4.3 用 Leaf/Intermediate/Root 生成 CWT（COSE_Sign1）
  console.log("▶ 正在生成 CWT...");
  const cwtBinary = await createCwtWithX5chain(jwk, HOLDER_DID, leafKeyPem);
  const cwtBase64Url = Buffer.from(cwtBinary).toString("base64url");
  console.log("\nCWT (Base64URL):\n", cwtBase64Url);

}

main().catch((err) => {
  console.error("❌ エラー発生:", err);
  process.exit(1);
});
