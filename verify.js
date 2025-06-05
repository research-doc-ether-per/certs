/* =======================================================================
 *  SD-JWT VC を「選択的開示付き」で呈示用トークンに変換するユーティリティ
 *  ---------------------------------------------------------------------
 *  - 依存ライブラリ
 *      pnpm add @sd-jwt/core @sd-jwt/present @sd-jwt/crypto-nodejs jose base64url
 *  - このファイル 1 枚だけで完結させるため、ヘルパ関数も同居させています
 *  - ESModules を利用する想定（package.json に "type": "module" を入れるか、
 *    拡張子を .mjs に変更してください）
 * =====================================================================*/

import { present }          from '@sd-jwt/present';
import { SignJWT, importPKCS8 } from 'jose';

/* ----------------------------------------------------------------------
 *  SD-JWT 部品を分割するヘルパー
 * --------------------------------------------------------------------*/
/**
 * SD-JWT 文字列を「Issuer JWT／披露群／KB-JWT」に分割する
 * @param {string} compact SD-JWT の複合文字列（<iss>~<disc…>~<kb>）
 * @returns {{issuerJwt:string, disclosures:string[], keyBindingJwt:string}}
 */
function splitSdJwt(compact) {
  const parts = compact.split('~');
  if (parts.length < 2) {
    throw new Error('SD-JWT 文字列が不正です（~ 区切りが不足）');
  }
  return {
    issuerJwt:      parts[0],
    disclosures:    parts.slice(1, -1),     // 最後の要素手前まで
    keyBindingJwt:  parts.at(-1),           // 最後の要素
  };
}

/* ----------------------------------------------------------------------
 *  メイン：呈示用 SD-JWT を生成
 * --------------------------------------------------------------------*/
/**
 * SD-JWT VC を選択的開示して呈示トークンに変換する
 *
 * @param {string} combined         全部入り SD-JWT（<iss>~<disc…>~<kb>）
 * @param {string[]} selected       公開したい disclosure（Base64URL 配列）
 * @param {string} aud             Verifier の Audience
 * @param {string} nonce           Nonce（無い場合は ''）
 * @param {string} pkcs8Pem        Holder 用 ES256 秘密鍵（PKCS8 PEM）
 * @param {string} kid             DID Authentication Key の kid
 * @returns {Promise<string>}      完成した SD-JWT（<iss>~<selDisc…>~<kb>）
 */
export async function buildPresentedSdJwt(
  combined,
  selected,
  aud,
  nonce = '',
  pkcs8Pem,
  kid,
) {
  /* ① SD-JWT を分割 --------------------------------------------------- */
  const { issuerJwt, keyBindingJwt } = splitSdJwt(combined);

  /* ② 秘密鍵 PEM → CryptoKey へ変換 ---------------------------------- */
  const privateKey = await importPKCS8(pkcs8Pem, 'ES256');

  /* ③ SD-JWT ライブラリに渡す signer 実装 ----------------------------- */
  async function signer(payload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT', kid })
      .sign(privateKey);
  }

  /* ④ 選択的開示 ------------------------------------------------------ */
  const presented = await present({
    issuerJwt,              // 发行者の JWT
    disclosures: selected,  // 開示するものだけ
    keyBindingJwt,          // 既存の KB-JWT をそのまま利用
    holderKid: kid,         // Holder の kid
    sign: signer,           // KB-JWT を再署名する関数
    aud,
    nonce,
  });

  /* ⑤ compact 文字列で返却 ------------------------------------------- */
  return presented.compact();
}

/* ----------------------------------------------------------------------
 *  サンプル実行（コメントアウト解除で動作確認）
 * --------------------------------------------------------------------*/
// (async () => {
//   /* ------ ここに実際の値を差し込んでテストしてください ------ */
//   const combinedSdJwt = '<issuerJwt>~<disc1>~<disc2>~<kbJwt>';
//   const disclosuresToShow = ['<disc1>', '<disc2>'];  // 公開したいディスクロージャ
//   const audience = 'https://verifier.example.org';
//   const nonce = 'abc123xyz';
//   const holderKeyPem = `-----BEGIN PRIVATE KEY-----
// （ES256 用の PKCS8 秘密鍵 PEM）
// -----END PRIVATE KEY-----`;
//   const keyId = 'did:example:123#keys-1';

//   const result = await buildPresentedSdJwt(
//     combinedSdJwt,
//     disclosuresToShow,
//     audience,
//     nonce,
//     holderKeyPem,
//     keyId,
//   );
//   console.log('\n=== 提示用 SD-JWT ===\n', result);
// })();
