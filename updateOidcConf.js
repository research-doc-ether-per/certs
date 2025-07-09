// src/middleware/introspect.js
const axios = require('axios');

// 複数のRealmに対応したクライアント認証情報を設定
// 環境変数またはconfigファイルから取得
const realmConfigs = {
  'https://auth.example.com/auth/realms/wallet-personal': {
    clientId:     process.env.PERSONAL_CLIENT_ID,        // Personal RealmのClient ID
    clientSecret: process.env.PERSONAL_CLIENT_SECRET,    // Personal RealmのClient Secret
  },
  'https://auth.example.com/auth/realms/wallet-organization': {
    clientId:     process.env.ORG_CLIENT_ID,             // Organization RealmのClient ID
    clientSecret: process.env.ORG_CLIENT_SECRET,         // Organization RealmのClient Secret
  },
  // その他のRealmを追加する場合は同様にキーを増やす
};

/**
 * BearerトークンをIntrospectionし、Tokenの有効性とスコープを検証するミドルウェア
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function introspect(req, res, next) {
  try {
    // Authorizationヘッダの検証
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      // Bearer トークンがない、または形式が不正
      return res.status(401).json({ error: 'Authorizationヘッダが不正です' });
    }

    // Bearerトークンを抽出
    const token = auth.slice(7);

    // JWTのpayloadからissを取得
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString('utf8')
      );
    } catch (e) {
      // トークンのデコードに失敗
      return res.status(400).json({ error: 'トークンの形式が不正です' });
    }

    // 対応するRealm設定をマップから取得
    const iss = payload.iss;
    const cfg = realmConfigs[iss];
    if (!cfg) {
      // 未対応のIssuer
      return res.status(401).json({ error: `未対応のIssuerです: ${iss}` });
    }

    // IntrospectionエンドポイントのURLを生成
    const introspectUrl = `${iss}/protocol/openid-connect/token/introspect`;

    // Introspectionリクエストパラメータを構築
    const params = new URLSearchParams({
      token,
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
    });

    // Introspection API呼び出し
    const { data } = await axios.post(
      introspectUrl,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // トークンが有効か確認
    if (!data.active) {
      // Introspection結果で無効と判断
      return res.status(401).json({ error: '無効なトークンです' });
    }

    // Introspection結果をreq.userに格納
    req.user = data;
    next();
  } catch (err) {
    // 予期しないエラー
    console.error('Introspectionエラー:', err);
    res.status(500).json({ error: 'Introspectionに失敗しました' });
  }
}

module.exports = introspect;
