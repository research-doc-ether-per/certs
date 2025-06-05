/* =======================================================================
 *  SD-JWT VC を「選択的開示付き」で呈示用トークンに変換するユーティリティ
 *  ---------------------------------------------------------------------
 *  - 依存ライブラリ
 *      pnpm add @sd-jwt/core @sd-jwt/present @sd-jwt/crypto-nodejs jose
 *  - Walt.id の /draft13/credential で得られる SD-JWT VC は
 *      <issuerJwt>~<disclosure1>~<disclosure2>…        ← KB-JWT なし！
 *  - このファイル 1 枚だけで完結させるため、ヘルパ関数も同居させています
 *  - ESModules 想定（package.json に "type": "module" を追加するか、
 *    拡張子 .mjs に変更してください）
 * =====================================================================*/

import { present }                   from '@sd-jwt/present';
import { SignJWT, importPKCS8 }      from 'jose';

/* ----------------------------------------------------------------------
 *  SD-JWT 部品を分割するヘルパー
 * --------------------------------------------------------------------*/
/**
 * <issuerJwt>~<disc…> 形式を分解
 * @param {string} compact SD-JWT テキスト
 * @returns {{issuerJwt:string, disclosures:string[]}}
 */
function splitSdJwtNoKb(compact) {
  const parts = compact.split('~');
  if (parts.length < 2) throw new Error('SD-JWT 文字列が不正です（disclosure が不足）');
  return {
    issuerJwt:   parts[0],
    disclosures: parts.slice(1),   // 末尾まで全部 disclosure
  };
}

/* ----------------------------------------------------------------------
 *  メイン：呈示用 SD-JWT を生成
 * --------------------------------------------------------------------*/
/**
 * SD-JWT VC を選択的開示して呈示トークンに変換
 *
 * @param {string} issued        Walt.id が発行した SD-JWT (<iss>~<disc…>)
 * @param {string[]} selected    公開したい disclosure（Base64URL 配列）
 * @param {string} aud           Verifier の Audience
 * @param {string} nonce         Nonce（なければ ''）
 * @param {string} pkcs8Pem      Holder 用 ES256 秘密鍵（PKCS8 PEM）
 * @param {string} kid           DID Authentication Key の kid
 * @returns {Promise<string>}    <issuerJwt>~<selDisc…>~<kbJwt> 形式
 */
export async function buildPresentedSdJwt(
  issued,
  selected,
  aud,
  nonce = '',
  pkcs8Pem,
  kid,
) {
  /* ① SD-JWT を分割 --------------------------------------------------- */
  const { issuerJwt } = splitSdJwtNoKb(issued);

  /* ② 秘密鍵 PEM → CryptoKey へ変換 ---------------------------------- */
  const privateKey = await importPKCS8(pkcs8Pem, 'ES256');

  /* ③ signer 実装（KB-JWT 用） --------------------------------------- */
  async function signer(payload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid })
      .sign(privateKey);
  }

  /* ④ 選択的開示 + KB-JWT 生成 ---------------------------------------- */
  const presented = await present({
    issuerJwt,
    disclosures: selected,  // Holder が公開したいものだけ
    // keyBindingJwt を渡さない ⇒ ライブラリが signer で新規生成
    holderKid: kid,
    sign: signer,
    aud,
    nonce,
  });

  /* ⑤ compact 形式で返却 --------------------------------------------- */
  return presented.compact();      // => <issuerJwt>~<selDisc…>~<kbJwt>
}

/* ----------------------------------------------------------------------
 *  サンプル実行（コメントアウト解除で動作確認）
 * --------------------------------------------------------------------*/
// (async () => {
//   const issuedSdJwt = '<issuerJwt>~<disc1>~<disc2>';  // Issuer から取得したまま
//   const disclosuresToShow = ['<disc1>'];             // 公開する disclosure
//   const audience = 'https://verifier.example.org';
//   const nonce = 'abc123xyz';
//   const holderKeyPem = `-----BEGIN PRIVATE KEY-----
// （ES256 用 PKCS8 秘密鍵 PEM）
// -----END PRIVATE KEY-----`;
//   const kid = 'did:example:123#key-1';
//
//   const result = await buildPresentedSdJwt(
//     issuedSdJwt,
//     disclosuresToShow,
//     audience,
//     nonce,
//     holderKeyPem,
//     kid,
//   );
//   console.log('\n=== 提示用 SD-JWT ===\n', result);
// })();
