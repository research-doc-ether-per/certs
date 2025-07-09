// sessionStore.js
const session = require('express-session');
// 也可以换成 connect-redis、connect-mongo 等外部存储
const store = new session.MemoryStore();
module.exports = store;


app.use(session({
  store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

const { auth } = require('express-openid-connect');
const store      = require('../../sessionStore');
const oidcConfig = require('../../config/oidc.json');

function getStaticOidcMiddleware() {
  const cfg = oidcConfig['other-realm'];
  return auth({
    issuerBaseURL: cfg.issuerBaseURL,
    baseURL:       process.env.BASE_URL,
    clientID:      cfg.clientID,
    clientSecret:  cfg.clientSecret,  // 如果用 client_secret_post 
    secret:        process.env.SESSION_SECRET, // openssl rand -base64 32
    authRequired:  false,
    routes:        { login:false, logout:false, callback:false },
    session:       { store },          // ← 复用同一个 store
    clientAuthMethod: 'client_secret_post',
    tokenIntrospection: {
      endpoint:   '/protocol/openid-connect/token/introspect',
      grant_type: 'client_credentials',
    },
  });
}
