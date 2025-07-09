const config = {
  issuerBaseURL: 'https://…/realms/wallet-personal',
  baseURL:       'https://api.example.com',
  clientID:      '…',
  secret:        '…',
  authRequired:  false,
  routes: {
    login:    false,
    logout:   false,
    callback: false,
  },
  auth0Logout: true,
  authorizationParams: {
    response_mode: 'query',
    response_type: ['token'],
  },
  session: {
    store: false,
  },
  clientAuthMethod: 'client_secret_post',
  tokenIntrospection: {
    endpoint:    '/protocol/openid-connect/token/introspect',
    grant_type:  'client_credentials',
  },
};
