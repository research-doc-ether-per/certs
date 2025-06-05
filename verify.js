// ファイル名：generateVpForSdJwt.js

import { SignJWT, importJWK, decodeJwt } from "jose";
import {
  parseSDJWT,              // SD-JWT文字列をパースする関数
  createDisclosurePayload,  // Disclosure 情報を整理する関数
  createDisclosureFromPayload, // Disclosure を最終文字列化する関数
  createSdJwtPresentationJwt  // KB-JWT（Key-Binding JWT）を作る関数
} from "@transmute/sd-jwt";

/**
 * Holder が提示するときの一連の流れをまとめた関数。
 *
 * @param {Array<{ id: string, format: string, document: string }>} matchedCredentials
 *   - Wallet が保管している「SD-JWT VC」および他の形式の VC の一覧。
 *   - 形式が SD-JWT VC のものは `format === "sd_jwt_vc"`、`document` に
 *     Issuer 署名済みの "<jwsCore>~<disclosure1>~<disclosure2>~…" という文字列を持つ。
 *
 * @param {{ [credentialId: string]: string[] }} selectedDisclosures
 *   - Holder が「どの VC のどの Disclosure を、Verifier に見せるか」を選択した結果。
 *   - キーが credential.id、値が「表示したい Disclosure の文字列配列」。
 *   - たとえば { "cred-123": [ "WyIxIiwiYWJjZCJd", "WyIyIiwiMTIzNCI=" ] } のように
 *     Base64URL化されたディスクロージャーを列挙した形。
 *
 * @param {{ kty: string, crv: string, d: string, x: string, alg: string, kid: string }} holderPrivateJwk
 *   - Holder の DID に対応する秘密鍵 JWK。`alg`（例: "EdDSA"）および `kid`（例: "did:example:holder456#key-1"）
 *     を含んでいる必要がある。
 *
 * @param {string} holderDid
 *   - Holder 自身の DID（例: "did:example:holder456"）。VP の `iss` に使う。
 *
 * @param {string} verifierClientId
 *   - Verifier が OIDC4VCI の authorize フローで伝えてきた `client_id`。
 *   - VP の `aud` にこれを使う（例: "https://verifier.demo.walt.id/openid4vc/verify"）。
 *
 * @param {string} nonce
 *   - OIDC4VCI の authorize フローで Verifier から渡された nonce。
 *   - VP の `nonce` に使う。
 *
 * @returns {Promise<string>}
 *   - 最終的に「Holder が Verifier に送るべき Verifiable Presentation (JWS 文字列)」を返す。
 */
export async function generateSdJwtPresentation(
  matchedCredentials,
  selectedDisclosures,
  holderPrivateJwk,
  holderDid,
  verifierClientId,
  nonce
) {
  // ──────────────────────────────────────────────────────────────────────────────
  // 1. SD-JWT VC を提示用に組み立てる
  // ──────────────────────────────────────────────────────────────────────────────
  //
  // matchedCredentials の中から、SD-JWT VC 形式のものだけを取り出し、
  // 「Base SD-JWT VC（Issuer が発行した <jwsCore>~<disclosure…>）」
  // と「Holder が選択した disclosures（Base64URL 文字列）」を
  // 波線 '~' でつなぎ合わせて最終的に Verifier に提示する文字列を作る。
  //
  // 例えば matchedCredentials の中に:
  //   { id: "cred-123", format: "sd_jwt_vc", document: "<jwsCore>~<d1>~<d2>~<d3>" }
  // という VC が入っているとし、selectedDisclosures["cred-123"] = ["<d1>", "<d2>"] の場合、
  //   "documentWithDisclosures" = "<jwsCore>~<d1>~<d2>"
  //
  const sdJwtVcPresentedArray = matchedCredentials
    .filter((cred) => cred.format === "sd_jwt_vc")
    .map((cred) => {
      // cred.document は Issuer 署名済みの "<jwsCore>~<disclosure1>~<disclosure2>~…" という文字列
      const baseSdJwtString = cred.document;
      const disclosuresForThisVc = selectedDisclosures?.[cred.id] ?? [];
      // もし Holder が何も選択していなければ「document 自体」を丸ごと使う
      // 選択がある場合は、Issuer が最初に署名した jwsCore（document.split("~")[0]）に
      // Holder 自身が選んだ disclosures を波線でつなぐ
      if (disclosuresForThisVc.length > 0) {
        // 先頭の jwsCore 部分だけ取り出す
        const [jwsCore /* , ...rest */] = baseSdJwtString.split("~");
        // Holder が見せたい Disclosure を join("~") してくっつける
        return [jwsCore, ...disclosuresForThisVc].join("~");
      }
      return baseSdJwtString;
    });

  // 例: ["<jwsCore1>~<d1>~<d2>", "<jwsCore2>~<dA>"] のような文字列配列になる

  // ──────────────────────────────────────────────────────────────────────────────
  // 2. SD-JWT+KB 形式の Presentation／Holder バインディング JWT を作る
  // ──────────────────────────────────────────────────────────────────────────────
  //
  // SD-JWT 仕様では、「Holder がこの VC を確かに自分のものとして提示した」ことを証明する
  // キー・バインディング JWT（KB-JWT）を付与する必要があります。
  // その KB-JWT の中身は、最終的に Verifier がチェックする以下のような形式になっていることが多いです:
  //
  //   Header:
  //     {
  //       alg: "<Holder key の alg>",   // 例: "EdDSA"
  //       typ: "JWT",
  //       kid: "<Holder DID のキーID>"  // 例: "did:example:holder456#key-1"
  //     }
  //   Payload:
  //     {
  //       iss: "<Holder DID>",           // VP の発行者でもある Holder 自身
  //       aud: "<Verifier の client_id>",
  //       nonce: "<OIDC4VCI で渡された nonce>",
  //       sd_jwt: "<jwsCore 部分のみ>"   // Issuer 署名済み SD-JWT の "jwsCore"（Disclosure を取り去った）
  //     }
  //
  // 「jwsCore 部分のみ」は、たとえば "<base64Header>.<base64DigestPayload>.<base64Signature>" の形です。
  // これに Holder がキープライベートで署名し、KB-JWT を完成させると、最終的な提示文字列は：
  //
  //   "<jwsCore>~<disclosure1>~…~<disclosureN>~<kbJwt>"
  //
  // になります。このまま Verifier に渡すと、下記のように検証されます:
  //   1. Verifier はまず "<jwsCore>.<signature>" 部分の Issuer 署名を検証し、
  //      digests（非開示部分）が改ざんされていないことをチェック。
  //   2. 次に Holder が付与した disclosures をハッシュ化して digests と一致するか検証。
  //   3. Disclosure で公開されたクレームを Payload に戻して、「完全版 VC」を復元。
  //   4. さらに末尾の "<kbJwt>" を検証し、Holder が正しく自己のキーを使っていることを保証。
  //
  // まずは「提示用 SD-JWT VC 文字列配列」から、jwsCore 部分だけ抜き出すヘルパーを用意します:
  function extractJwsCore(sdJwtString) {
    // "xxx~yyy~zzz" のような文字列から、先頭の "xxx" を返す
    return sdJwtString.split("~")[0];
  }

  // Holder キーを import して jose の KeyObject に変換する
  const holderPrivateKey = await importJWK(
    holderPrivateJwk,
    holderPrivateJwk.alg
  );

  // ここで最終的に各 VC に対応する「SD-JWT+KB 形式の提示文字列」を作る
  const sdJwtPlusKbArray = await Promise.all(
    sdJwtVcPresentedArray.map(async (sdJwtString) => {
      // 2-1. SD-JWT VC で最初の jwsCore 部分だけを取り出す
      const jwsCore = extractJwsCore(sdJwtString);

      // 2-2. KB-JWT のペイロードを組み立てる
      const kbPayload = {
        iss: holderDid,
        aud: verifierClientId,
        nonce: nonce,
        sd_jwt: jwsCore
      };

      // 2-3. KB-JWT の JWS を作る
      const kbJwt = await new SignJWT(kbPayload)
        .setProtectedHeader({
          alg: holderPrivateJwk.alg, // 例: "EdDSA"
          typ: "JWT",
          kid: holderPrivateJwk.kid  // 例: "did:example:holder456#key-1"
        })
        .sign(holderPrivateKey);

      // 2-4. SD-JWT VC 本体（jwsCore～disclosures）と KB-JWT を '~' でつなぐ
      // 結果例: "<jwsCore>~<disc1>~…~<discN>~<kbJwt>"
      return [sdJwtString, kbJwt].join("~");
    })
  );

  // たとえば sdJwtPlusKbArray = [
  //   "<jwsCore1>~<d1>~<d2>~…~<kbJwt1>",
  //   "<jwsCore2>~<dA>~<kbJwt2>",
  //   …
  // ]

  // ──────────────────────────────────────────────────────────────────────────────
  // 3. Verifiable Presentation 全体を構築して署名する
  // ──────────────────────────────────────────────────────────────────────────────
  //
  // ここまでで「各 SD-JWT VC ごとの提示文字列」は sdJwtPlusKbArray に揃いました。
  // それらをそのまま VP の `verifiableCredential` 配列に入れて、最後に VP を Holder の
  // キーで JWS 署名すれば完成です。
  //
  // (A) VP の JSON ペイロードを構築
  const vpPayload = {
    vp: {
      type: ["VerifiablePresentation", "SdJwtVerifiablePresentation"],
      verifiableCredential: sdJwtPlusKbArray
    },
    iss: holderDid,
    aud: verifierClientId,
    nonce: nonce,
    iat: Math.floor(Date.now() / 1000)
  };

  // (B) Holder のキーを import しておく（すでに import 済みの場合は再利用可）
  //     const holderPrivateKey = await importJWK(holderPrivateJwk, holderPrivateJwk.alg);

  // (C) VP を JWS 署名する
  const vpJwt = await new SignJWT(vpPayload)
    .setProtectedHeader({
      alg: holderPrivateJwk.alg, // 例: "EdDSA"
      typ: "JWT",
      kid: holderPrivateJwk.kid  // 例: "did:example:holder456#key-1"
    })
    .sign(holderPrivateKey);

  // これが最終的に Verifier に渡すべき「SD-JWT ベースの VP-JWT」です
  return vpJwt;
}
