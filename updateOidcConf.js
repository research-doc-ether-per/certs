const { Issuer } = require('openid-client');
const oidc = await Issuer.discover(process.env.ISSUER_BASE_URL);
const client = new oidc.Client({
  client_id:     process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
});

module.exports = async function introspect(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const meta  = await client.introspect(token, 'access_token');
    if (!meta.active) throw new Error('inactive');
    req.user = meta;  // 把 introspection 返回的内容 attach 给 req
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid_token' });
  }
};


 src/middleware/openidClientAuth.js
const { Issuer } = require('openid-client');

let personalClient, orgClient;
(async () => {
  // 複数のRealmをそれぞれDiscover
  const personalIssuer = await Issuer.discover(process.env.PERSONAL_ISSUER_BASE_URL);
  personalClient = new personalIssuer.Client({
    client_id:     process.env.PERSONAL_CLIENT_ID,
    client_secret: process.env.PERSONAL_CLIENT_SECRET,
  });
  const orgIssuer = await Issuer.discover(process.env.ORG_ISSUER_BASE_URL);
  orgClient = new orgIssuer.Client({
    client_id:     process.env.ORG_CLIENT_ID,
    client_secret: process.env.ORG_CLIENT_SECRET,
  });
})();

/**
 * Bearer トークンをIntrospectionし、activeチェックを行うミドルウェア
 */
async function openidClientAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorizationヘッダがありません' });
    }
    const token = auth.slice(7);

    // JWTのpayload部からissを取得
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    let client;
    if (payload.iss === process.env.PERSONAL_ISSUER_BASE_URL) {
      client = personalClient;
    } else if (payload.iss === process.env.ORG_ISSUER_BASE_URL) {
      client = orgClient;
    } else {
      return res.status(401).json({ error: '不明なiss' });
    }

    // Introspectionエンドポイント呼び出し
    const introspection = await client.introspect(token, 'access_token');
    if (!introspection.active) {
      return res.status(401).json({ error: 'トークンが無効です' });
    }

    // Introspection結果をreq.userにセット
    req.user = introspection;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = openidClientAuth;
