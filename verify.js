// ファイル：makeVerifiablePresentation.js

import { SignJWT, importJWK, decodeJwt } from "jose";

/**
 * 複数の署名済み JWT-VC（JWS 文字列）のサンプル配列。
 * 実際の運用では、これらは Holder が Issuer から取得した Verifiable Credential です。
 */
const exampleVcJwtArray = [
  // VC1（Issuer によって署名された JWS）
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJ0eXBlIjpbIk9wZW5CYWRnZUNyZWRlbnRpYWwiXX19.VC1_SIGNATURE",
  // VC2（別の Issuer または同一 Issuer によって署名された JWS）
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJ0eXBlIjpbIk9wZW5CYWRnZUNyZWRlbnRpYWwiXX19.VC2_SIGNATURE"
];

/**
 * Holder の DID と対応する私鍵（JWK フォーマット）。
 * この鍵を使って Verifiable Presentation (VP) を JWS 署名します。
 */
const HOLDER_DID = "did:example:holder123";

// Ed25519 私鍵の最小 JWK 例。alg フィールドは必須。
const HOLDER_PRIVATE_JWK = {
  kty: "OKP",                  // キーの種類：Octet Key Pair（Ed25519）
  crv: "Ed25519",              // カーブ名
  d: "nWGxneL7O2K3tgLJ7bWZ-f0W3wExB6sNzzyFjFfRn_U", // 私鍵の Base64URL エンコード値
  x: "11qYAYpkcT1eA1d6XR4ztP3N5966vX6R7Uw3dJg3Pl0", // 公開鍵の Base64URL エンコード値
  alg: "EdDSA"                 // 使用アルゴリズム
};

/**
 * crv フィールドから対応する alg を推測する関数
 *
 * @param {string} crv - JWK の crv 値（例: "Ed25519", "P-256", "secp256k1"）
 * @returns {string} alg 名（例: "EdDSA", "ES256", "ES256K"）
 * @throws {Error} サポート外の crv が渡された場合に例外を投げる
 */
function guessAlgFromCrv(crv) {
  switch (crv) {
    // Ed25519 カーブの場合、アルゴリズムは EdDSA
    case "Ed25519":
      return "EdDSA";
    // P-256 カーブの場合、アルゴリズムは ES256
    case "P-256":
      return "ES256";
    // secp256k1 カーブの場合、アルゴリズムは ES256K
    case "secp256k1":
      return "ES256K";
    // その他のカーブはサポート外
    default:
      throw new Error(`サポートされていない crv：${crv}`);
  }
}

/**
 * @async
 * 複数の JWT-VC をまとめて Verifiable Presentation (VP) にし、
 * Holder の私鍵で JWS 署名して返す関数。
 *
 * @param {string[]} vcJwtArray - 署名済みの JWT-VC（JWS 文字列）の配列
 * @param {string} holderDid - Holder の DID（VP の iss として使用）
 * @param {object} holderPrivateJwk - Holder の私鍵 JWK
 * @param {string} verifierClientId - Verifier の client_id（VP の aud として使用）
 * @param {string} nonce - OIDC4VP フローから渡される nonce
 * @returns {Promise<string>} - 署名済みの VP JWS（JWT 文字列）
 */
async function createVerifiablePresentationJwt(
  vcJwtArray,
  holderDid,
  holderPrivateJwk,
  verifierClientId,
  nonce
) {
  // ------------------------------
  // (1) VP のペイロードを構築
  // ------------------------------
  // vp.type: "VerifiablePresentation" を指定し、
  // vp.verifiableCredential に配列内のすべての JWT-VC を設定する。
  const vpPayload = {
    vp: {
      type: ["VerifiablePresentation"],
      verifiableCredential: vcJwtArray
    },
    // JWT の標準フィールド
    iss: holderDid,             // 発行者：Holder の DID
    aud: verifierClientId,      // 受取人：Verifier の client_id
    nonce: nonce,               // リプレイ防止用のランダム文字列
    iat: Math.floor(Date.now() / 1000) // 発行時間（秒）
  };

  // ------------------------------
  // (2) JWK を jose ライブラリが扱える鍵オブジェクトにインポート
  // ------------------------------
  // importJWK で JWK と使用アルゴリズムを渡して、KeyObject を取得
  if (!holderPrivateJwk.alg) {
    holderPrivateJwk.alg = guessAlgFromCrv(holderPrivateJwk.crv);
  }

  const privateKey = await importJWK(holderPrivateJwk, holderPrivateJwk.alg);

  // ------------------------------
  // (3) SignJWT を使ってペイロードを JWS（JWT）形式で署名
  // ------------------------------
  // Protected Header には alg（署名アルゴリズム）と typ（JWT）を指定
  const vpJwt = await new SignJWT(vpPayload)
    .setProtectedHeader({ alg: holderPrivateJwk.alg, typ: "JWT" })
    .sign(privateKey);

  return vpJwt;
}

/**
 * （オプション）署名済み VP JWS から内部の verifiableCredential 配列を抽出する関数
 * 主にデバッグやテスト用途。実運用では Verifier 側がこの処理を行う。
 *
 * @param {string} vpJwt - 署名済みの VP JWS（JWT 文字列）
 * @returns {string[]} - VP 内に含まれる JWT-VC の配列
 */
function extractVcArrayFromVp(vpJwt) {
  // decodeJwt で JWS のペイロードをデコードし、payload.vp.verifiableCredential を取り出す
  const decoded = decodeJwt(vpJwt);
  return decoded.vp.verifiableCredential;
}

/**
 * メイン処理：OIDC4VP フローで渡される
 * - verifierClientId（Verifier の client_id）
 * - nonce（OIDC4VP の authorize で生成される）
 *
 * を想定し、複数の JWT-VC から VP を生成してコンソールに出力する。
 */
;(async () => {
  try {
    // (4) OIDC4VP フローで Verifier から受け取るパラメータを想定
    const verifierClientId = "https://verifier.demo.walt.id/openid4vc/verify";
    const nonce = "faa5d51f-b16c-4d14-aac2-b52312b40e2c";

    // (5) VP JWS を生成
    const vpJwt = await createVerifiablePresentationJwt(
      exampleVcJwtArray,
      HOLDER_DID,
      HOLDER_PRIVATE_JWK,
      verifierClientId,
      nonce
    );
    console.log("✅ 生成された Verifiable Presentation (JWS)：\n", vpJwt);

    // (6) （オプション）内部の VC 配列を抽出して表示
    const innerVcList = extractVcArrayFromVp(vpJwt);
    console.log("⤷ VP に含まれる VC 配列（デバッグ用）：", innerVcList);
    // innerVcList は exampleVcJwtArray と同一であるはず

    // (7) ここまでで作成された VP JWS (vpJwt) を、そのまま Verifier に送信可能
    //     例えば OIDC4VP の verify エンドポイントに対して HTTP POST で送る。
    //
    // POST https://verifier.demo.walt.id/openid4vc/verify/{state}
    // Content-Type: application/json
    //
    // {
    //   "vp_token": "<ここに vpJwt をセット>"
    // }
    //
    // Verifier によっては presentation_submission も同時に必要な場合がある。
    // その場合は以下のように作成してリクエストに含める。
    //
    // const descriptorMap = innerVcList.map((vcJwt, idx) => {
    //   const decodedVc = decodeJwt(vcJwt);
    //   const types = decodedVc.vc.type || ["VerifiableCredential"];
    //   const lastType = types[types.length - 1];
    //
    //   return {
    //     id: "OpenBadgeCredential",      // PD 内の input_descriptor.id と一致させる
    //     format: "jwt_vc_json",          // JWT-VC の形式を示す
    //     path: `$.vp.verifiableCredential[${idx}]`  // VP ペイロード内のパス
    //   };
    // });
    //
    // const presentationSubmission = {
    //   id: "eXwb1zELUCXU",               // PD の ID
    //   definition_id: "eXwb1zELUCXU",   // PD の ID を再度指定
    //   descriptor_map: descriptorMap
    // };
    //
    // リクエスト例：
    // {
    //   "vp_token": "<vpJwt>",
    //   "presentation_submission": presentationSubmission
    // }
    //
  } catch (e) {
    console.error("❌ Verifiable Presentation の生成に失敗：", e);
  }
})();
