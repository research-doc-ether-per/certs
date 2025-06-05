// 文件名：makeVerifiablePresentation.js

import { SignJWT, importJWK, decodeJwt } from "jose";

/**
 * 示例：多个已签名的 JWT-VC（也就是你已经拿到的 JWS 字符串）
 * 真实场景里，你可能是先向 ISSUER API 请求拿到 VC-Offer，然后
 * 通过 Holder 钱包完成 VC 存储后，这里才有这些 VC-JWS。
 */
const exampleVcJwtArray = [
  // VC1（已通过某个 Issuer 签名好的 JWS）
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJ0eXBlIjpbIk9wZW5CYWRnZUNyZWRlbnRpYWwiXX19.VC1_SIGNATURE",
  // VC2（另一个 Issuer 或同一个 Issuer 签名好的）
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJ0eXBlIjpbIk9wZW5CYWRnZUNyZWRlbnRpYWwiXX19.VC2_SIGNATURE",
  // …如果还有更多，就继续 push 进去
];

/**
 * Holder 的 DID + 私钥（JWK 格式），用来对 VP 做最终的 JWS 签名
 * 这里用 Ed25519（EdDSA）举例，你也可以用 secp256k1 / ES256K 等，但
 * 关键是要和你的 VC 发放方、Verifier 都达成一致支持的算法。
 */
const HOLDER_DID = "did:example:holder123";

// 下面是一个 Ed25519 私钥的最小 JWK 样式，注意要带上 "alg": "EdDSA"
// “d” 是私钥， “x” 是对应的公钥
const HOLDER_PRIVATE_JWK = {
  kty: "OKP",
  crv: "Ed25519",
  d: "nWGxneL7O2K3tgLJ7bWZ-f0W3wExB6sNzzyFjFfRn_U",  // 私钥（Base64URL）
  x: "11qYAYpkcT1eA1d6XR4ztP3N5966vX6R7Uw3dJg3Pl0",  // 公钥（Base64URL）
  alg: "EdDSA",
};

/**
 * 把多个 JWT-VC 合并成一个 VP，并对 VP 做 JWS 签名
 *
 * @param {string[]} vcJwtArray         - 多个已经签名好的 JWT-VC 字符串
 * @param {string} holderDid            - Holder 的 DID，做 VP 的 iss
 * @param {object} holderPrivateJwk     - Holder 私钥的 JWK（必须含 alg 对应算法）
 * @param {string} verifierClientId      - Verifier 的 client_id（做 VP 的 aud）
 * @param {string} nonce                - 从 OIDC4VP 流程拿到的 nonce
 * @returns {Promise<string>}           - 返回一个签名好的 VP JWS（JWT 格式字符串）
 */
async function createVerifiablePresentationJwt(
  vcJwtArray,
  holderDid,
  holderPrivateJwk,
  verifierClientId,
  nonce
) {
  // 1. 构造 VP 的 Payload
  const vpPayload = {
    vp: {
      type: ["VerifiablePresentation"],
      // 把所有的 JWT-VC 字符串直接放到这个数组里
      verifiableCredential: vcJwtArray,
    },
    iss: holderDid,             // JWT 标准字段：签发者
    aud: verifierClientId,      // JWT 标准字段：观众/接收者
    nonce: nonce,               // OIDC4VP 流程给你的随机串
    iat: Math.floor(Date.now() / 1000), // 签发时间，秒级
  };

  // 2. 导入 JWK 私钥为 jose 可用的 KeyObject
  const privateKey = await importJWK(holderPrivateJwk, holderPrivateJwk.alg);

  // 3. 生成 JWS (VP JWT)
  const vpJwt = await new SignJWT(vpPayload)
    .setProtectedHeader({ alg: holderPrivateJwk.alg, typ: "JWT" })
    .sign(privateKey);

  return vpJwt;
}

/**
 * （可选）演示如何从刚生成的 VP JWS 中，把内部的 verifiableCredential 再拿出来
 * 一般只是为了测试、debug。当你把 VP 发送给 Verifier 后，Verifier 会自己做这一步。
 */
function extractVcArrayFromVp(vpJwt) {
  const decoded = decodeJwt(vpJwt);
  // decoded.vp.verifiableCredential 就是一个数组，元素正好是上面传进去的 VC-JWS 字符串
  return decoded.vp.verifiableCredential;
}

/**
 * 主流程：假设 OIDC4VP 流程已经给你下列信息：
 *   1. verifierClientId —— Verifier 在第一次 /authorize 请求时告诉你的 client_id
 *   2. nonce            —— 同样由 OIDC4VP 在 authorize 阶段生成并下发，你要在 VP 里携带
 *
 * 你已经有了若干 VC-JWS（例如 exampleVcJwtArray），下面就把它们合成 VP 并打印
 */
;(async () => {
  try {
    const verifierClientId = "https://verifier.demo.walt.id/openid4vc/verify";
    const nonce = "faa5d51f-b16c-4d14-aac2-b52312b40e2c";

    // 生成 VP JWS
    const vpJwt = await createVerifiablePresentationJwt(
      exampleVcJwtArray,
      HOLDER_DID,
      HOLDER_PRIVATE_JWK,
      verifierClientId,
      nonce
    );
    console.log("✅ 生成的 Verifiable Presentation (JWS)：\n", vpJwt);

    // （可选）验证一下内部的 VC 列表
    const innerVcList = extractVcArrayFromVp(vpJwt);
    console.log("⤷ VP 里包含的 VC 数组（仅作演示）：", innerVcList);
    // 注意：innerVcList 应当等于 exampleVcJwtArray

    // 到这里，你就可以把以下 JSON 发给 Verifier 了：
    //
    // POST https://verifier.demo.walt.id/openid4vc/verify/{state}
    // Content-Type: application/json
    //
    // {
    //   "vp_token": "<这里填 vpJwt 字符串>",
    //   // 如果你的 Verifier 需要 presentation_submission，可以自己拼一下，
    //   // 但是 Walt ID 验证端一般会根据 presentationDefinition 的 input_descriptors 去解析 vpJwt。
    // }
    //
    // 如果一定要提供 presentation_submission，参考下面的生成方式：
    //
    // const descriptorMap = innerVcList.map((vcJwt, idx) => {
    //   const decodedVc = decodeJwt(vcJwt);
    //   const types = decodedVc.vc.type || ["VerifiableCredential"];
    //   const lastType = types[types.length - 1];
    //
    //   return {
    //     id: "OpenBadgeCredential",       // 一般对应该 input_descriptor 的 id
    //     format: "jwt_vc_json",
    //     path: `$.vp.verifiableCredential[${idx}]`
    //   };
    // });
    //
    // const presentationSubmission = {
    //   id: "eXwb1zELUCXU",                 // 输入到 OIDC4VP authorize 阶段的 PD ID
    //   definition_id: "eXwb1zELUCXU",
    //   descriptor_map: descriptorMap
    // };
    //
    // 你可以决定要不要随请求一起发给 Verifier。
    //
  } catch (e) {
    console.error("❌ 生成 VP 失败：", e);
  }
})();
