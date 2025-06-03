
sequenceDiagram
    participant HolderApp as HolderApp
    participant IssuerAPI as Issuer API
    participant WalletAPI as Wallet API

    %% 1. Credential Offer 作成
    HolderApp->>IssuerAPI: Credential Offer 作成
    Note right of HolderApp: API: `/openid4vc/jwt/issue`, `/openid4vc/sd-jwt/issue`, `/openid4vc/mdoc/issue`
    IssuerAPI-->>HolderApp: 返却: クレデンシャルオファー URL

    %% 2. Holder Wallet へログイン
    HolderApp->>WalletAPI: Holder Wallet へログインしてアクセストークン取得
    Note right of HolderApp: API: `/wallet-api/auth/login`
    WalletAPI-->>HolderApp: 返却: アクセストークン

    %% 3. Wallet 側で Offer を解析して内容を確認
    HolderApp->>WalletAPI: Wallet 側で Offer を解析して内容を確認
    Note right of HolderApp: API: `/wallet-api/wallet/{wallet}/exchange/resolveCredentialOffer`

    %% 4. Issuer のサポート状態およびトークン取得（Wallet 内部処理）
        WalletAPI->>IssuerAPI: クレデンシャルオファーを解析
        Note Left of WalletAPI: API: `/{standardVersion}/credentialOffer`
        IssuerAPI-->>WalletAPI: 返却: { credential_issuer, grants, etc.}

        WalletAPI->>IssuerAPI: credentialConfigurationIdはサポート対象かどうかの確認
        Note Left of WalletAPI: API: `/{standardVersion}/.well-known/openid-credential-issuer`
        IssuerAPI-->>WalletAPI: 返却: {credential_configurations_supported, etc.}

        WalletAPI->>IssuerAPI: access_token取得
        Note Left of WalletAPI: API: `/{standardVersion}/token`
        IssuerAPI-->>WalletAPI: 返却: { access_token, token_type, expires_in, etc.}
        WalletAPI-->>HolderApp: 返却: { credential_issuer, grants, etc.}

    %% 5. Issuer から VC を請求し、Wallet に保存
    HolderApp->>WalletAPI: Issuer から VC を請求し、Wallet に保存
    Note right of HolderApp: API: `/wallet-api/wallet/{wallet}/exchange/useOfferRequest`

    %% 6. VC を請求（Wallet 内部処理）
        WalletAPI->>IssuerAPI: VC を請求
        Note Left of WalletAPI: API: `/{standardVersion}/credential`
        IssuerAPI-->>WalletAPI: 返却: VC (JWT-VC / SD-JWT / mDL)

    WalletAPI-->>HolderApp: 返却: ウォレットに保存された結果
