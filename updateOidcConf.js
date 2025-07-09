// src/app.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const http    = require('http');
const log4js  = require('log4js');
const { requiresAuth } = require('express-openid-connect');
const requireScope = require('./middleware/requireScope');
const { dynamicOidc } = require('./middleware/oidc');

const apiRouters   = require('./src/routes');
const log4jsConfig = require('./config/log4js.json');
const config       = require('./config/config.json');

const app = express();
let logger;

try {
  // ロガー & 基本ミドルウェア
  log4js.configure(log4jsConfig);
  logger = log4js.getLogger('server');
  app.use(log4js.connectLogger(log4js.getLogger('express'), { level:'info' }));
  app.use(cors({ origin:['http://localhost:3000'], credentials:true }));
  app.use(helmet());
  app.use(express.urlencoded({ extended:false }));
  app.use(express.json());

  // 動的 OIDC ミドルウェア
  app.use(dynamicOidc);

  // 健康チェック
  app.get('/health', (req, res) => res.status(200).json({ status:'OK' }));

  // /api ルートの保護
  app.use(
    '/api',
    requiresAuth(),              // トークン検証
    requireScope(['openid']),    // スコープ検証
    apiRouters
  );

  // サーバ起動
  const host = '0.0.0.0';
  const port = process.env.PORT || 10010;
  http.createServer(app).listen(port, host, () => {
    logger.info(`Server listening on ${host}:${port}`);
  });

} catch (err) {
  logger.error(`Server Error: ${err.stack}`);
  process.exit(1);
}

module.exports = app;
