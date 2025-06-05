// 文件：generatePresentationForVPToken.js

import {
  createPresentation,    // Walt ID SDK 用于生成 VP（JWS-签名）
  decodeJWT             // Walt ID SDK 用于解析 JWT，拿到 payload
} from "@walt.id/ssi-sdk";

/**
 * 假设我们有一个内存中的 credentialStore：
 *  key：从 presentationDefinition 里算出来的 filterString
 *  value：一个数组，里面每项是“已经签名好的 JWT-VC 字符串”。
 */
const credentialStore = {
  OpenBadgeCredential: [
    "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJ0eXBlIjpbIk9wZW5CYWRnZUNyZWRlbnRpYWwiXX19.VC1_signature",
    "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJ0eXBlIjpbIk9wZW5CYWRnZUNyZWRlbnRpYWwiXX19.VC2_signature"
  ]
};

// 持有者的 DID 和 Walt ID Wallet 中私钥别名，用于签名 VP
const HOLDER_DID       = "did:example:holder123";
const HOLDER_KEY_ALIAS = "holder-key-alias";

/**
 * 模拟一个“会话对象” generator，返回包含 presentationDefinition、nonce、authorizationRequest.clientId 的 plain object
 */
function createMockSession() {
  return {
    presentationDefinition: {
      id: "eXwb1zELUCXU",
      input_descriptors: [
        {
          id: "OpenBadgeCredential",
          format: {
            jwt_vc_json: {
              alg: ["EdDSA"]
            }
          },
          constraints: {
            fields: [
              {
                path: ["$.vc.type"],
                filter: {
                  type: "string",
                  pattern: "OpenBadgeCredential"
                }
              }
            ]
          }
        }
      ]
    },
    nonce: "faa5d51f-b16c-4d14-aac2-b52312b40e2c",
    authorizationRequest: {
      clientId: "https://verifier.demo.walt.id/openid4vc/verify"
    }
  };
}

/**
 * 生成一个“TokenRequest” plain object（示例中暂时不需要额外字段）
 */
function createMockTokenRequest() {
  return {};
}

/**
 * 核心函数：根据传入的 session（包含 presentationDefinition、nonce、clientId），
 * 从 credentialStore 里筛选符合的 VC，生成一个签名好的 JWT-VP，并返回 { vp_jwt, presentation_submission }。
 */
export async function generatePresentationForVPToken(session, tokenRequest) {
  // 1. 检查 presentationDefinition 是否存在
  if (!session.presentationDefinition) {
    throw new Error("invalid_request: presentationDefinition 为空");
  }
  const pd = session.presentationDefinition;

  // 2. 从 input_descriptors 中解析出 filterString
  const filterString =
    pd.input_descriptors
      .flatMap((desc) => desc.constraints?.fields ?? [])
      .find((field) => field.path.some((p) => p.includes("type")))
      ?.filter?.pattern ||
    pd.input_descriptors
      .flatMap((desc) => desc.schema?.map((s) => s.uri) ?? [])
      .find((uri) => !!uri);

  // 3. 从 credentialStore 中拿出所有匹配 filterString 的 JWT-VC
  const matchedVcArray = credentialStore[filterString] ?? [];

  // 4. 调用 Walt ID SDK，创建一个 Presentation（VP），将 matchedVcArray 塞进去
  const vpJwt = await createPresentation({
    presentation: {
      type: ["VerifiablePresentation"],
      verifiableCredential: matchedVcArray
    },
    did: HOLDER_DID,
    keyRef: HOLDER_KEY_ALIAS,
    aud: session.authorizationRequest.clientId,
    nonce: session.nonce
  });

  console.log("生成的 VP (JWT)：", vpJwt);

  // 5. 解码刚刚生成的 vpJwt，拿到 payload 中的 vp.verifiableCredential 数组
  const { payload: vpPayload } = await decodeJWT(vpJwt);
  const jwtCreds = vpPayload.vp.verifiableCredential;

  // 6. 构造 OIDC4VP 所需的 presentation_submission
  const descriptorMap = jwtCreds.map((vcJwtStr, idx) => {
    const { payload: vcPayload } = decodeJWT(vcJwtStr);
    const types = vcPayload.vc?.type || ["VerifiableCredential"];
    const vcType = types[types.length - 1];

    return {
      id: pd.input_descriptors[idx].id,
      format: "jwt_vp_json",
      path: "$",
      path_nested: {
        id: pd.input_descriptors[idx].id,
        format: "jwt_vc_json",
        path: `$.verifiableCredential[${idx}]`
      }
    };
  });

  const presentationSubmission = {
    id: pd.id,
    definition_id: pd.id,
    descriptor_map: descriptorMap
  };

  return {
    vp_jwt: vpJwt,
    presentation_submission: presentationSubmission
  };
}

// ==============================
// 如果你想测试一下这个函数：
(async () => {
  const session = createMockSession();
  const tokenRequest = createMockTokenRequest();

  try {
    const { vp_jwt, presentation_submission } =
      await generatePresentationForVPToken(session, tokenRequest);

    console.log("=== 最终返回给 OIDC4VP 的内容 ===");
    console.log(
      JSON.stringify(
        { vp_token: vp_jwt, presentation_submission },
        null,
        2
      )
    );
  } catch (err) {
    console.error("生成 VP 失败：", err);
  }
})();
