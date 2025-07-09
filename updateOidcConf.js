// middleware/oidc.js
const { auth } = require('express-openid-connect');
const oidcConfig = require('../config/oidc.json');
// oidc.json は以下のような構成を想定
// {
//   "wallet-personal": {
//     "issuerBaseURL": "https://auth.example.com/auth/realms/wallet-personal",
//     "clientID":       "<YOUR_PERSONAL_CLIENT_ID>",
//     "secret":         "<YOUR_PERSONAL_CLIENT_SECRET>"
//   },
//   "wallet-organization": {
//     "issuerBaseURL": "https://auth.example.com/auth/realms/wallet-organization",
//     "clientID":       "<YOUR_ORG_CLIENT_ID>",
//     "secret":         "<YOUR_ORG_CLIENT_SECRET>"
//   }
// }

const oidcCache = {};

/**
 * 指定された realmKey に対応する OIDC ミドルウェアを
 * 初回生成し、キャッシュから返却する
 * @param {string} realmKey - 'wallet-personal' か 'wallet-organization'
 * @returns {Function} express-openid-connect の auth ミドルウェア
 */
function getOidcMiddleware(realmKey) {
  if (!oidcCache[realmKey]) {
    const opts = {
      issuerBaseURL: oidcConfig[realmKey].issuerBaseURL,
      baseURL:       process.env.BASE_URL,
      clientID:      oidcConfig[realmKey].clientID,
      secret:        oidcConfig[realmKey].secret,
      authRequired:  false,  // 全リクエストで必須ログインはしない
      routes:        false,  // 自動生成されるログイン/ログアウトルートを無効化
    };
    oidcCache[realmKey] = auth(opts);
  }
  return oidcCache[realmKey];
}

/**
 * グローバルミドルウェア
 * リクエストヘッダ 'x-realm' によって
 * 'wallet-personal' または 'wallet-organization' を判定し、
 * 対応する OIDC ミドルウェアを動的に適用する
 */
function dynamicOidc(req, res, next) {
  const header = req.headers['x-realm'];
  const realmKey = header === 'wallet-organization'
    ? 'wallet-organization'
    : 'wallet-personal';
  // 選択した realmKey のミドルウェアを呼び出す
  return getOidcMiddleware(realmKey)(req, res, next);
}

module.exports = { dynamicOidc };

