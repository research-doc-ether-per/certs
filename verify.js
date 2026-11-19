 if (
    param?.body?.authType ===
    WALTID_AUTH_METHOD_TYPES.AUTHORIZATION_CODE
  ) {
    checkInfo.push(
      validateObject('authorization', 'body', {
        required: true,
      }),
      validateString('authorization.authorizationCode', 'body', {
        required: true,
      }),
      validateString('authorization.credentialEndpoint', 'body', {
        required: true,
      }),
      validateString('authorization.nonceEndpoint', 'body', {
        required: true,
      }),
      validateString('authorization.codeVerifier', 'body', {
        required: true,
      }),
      validateString(
        'authorization.credentialConfigurationId',
        'body',
        {
          required: true,
        }
      ),
      validateString(
        'authorization.credentialIssuerBaseUrl',
        'body',
        {
          required: true,
        }
      )
    )
  }
