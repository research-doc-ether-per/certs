
const express = require('express')
const router = express.Router()
const { authorize } = require('../services/keycloak-service')
const { requestCredential } = require('../controllers/holder-controller')
const {
  issueCredential,
  offerCredential,
} = require('../controllers/issuer-controller')

router.post('/credentials/issue', authorize('issuer'), issueCredential)
router.post('/credentials/offer', authorize('issuer'), offerCredential)

router.post('/credentials/request', authorize('holder'), requestCredential)

module.exports = router


// src/middleware/requireScope.js

/**
 * 必要な Scope をチェックするミドルウェアを生成
 * @param {string[]} requiredScopes - 要求されるスコープ名の配列
 * @returns {Function} Express用ミドルウェア関数
 */
function requireScope(requiredScopes) {
  return (req, res, next) => {
    // express-openid-connect の accessToken オブジェクトを取得
    const accessToken = req.oidc && req.oidc.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'アクセストークンが存在しません' });
    }

    // Token のクレームから scope の文字列を取得し、配列に変換
    const claims = accessToken.claims();
    const tokenScopes = (claims.scope || '').split(' ');

    // 必要なスコープがすべて含まれているか確認
    const hasAll = requiredScopes.every(s => tokenScopes.includes(s));
    if (!hasAll) {
      return res.status(403).json({ error: 'スコープが不足しています' });
    }

    // 問題なければ次のハンドラへ
    next();
  };
}

module.exports = requireScope;
