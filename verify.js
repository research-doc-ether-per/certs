CREATE SCHEMA IF NOT EXISTS wallet_app;

-- アカウント情報
CREATE TABLE IF NOT EXISTS wallet_app.accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    password_hash TEXT,
    created_on TEXT
);

-- アカウントと Wallet の関連情報
CREATE TABLE IF NOT EXISTS wallet_app.account_wallets (
    account_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    wallet_name TEXT,
    added_on TEXT,
    PRIMARY KEY (account_id, wallet_id)
);

-- OIDC ログイン情報
CREATE TABLE IF NOT EXISTS wallet_app.account_oidc_logins (
    account_id TEXT NOT NULL,
    oidc_id TEXT NOT NULL,
    PRIMARY KEY (account_id, oidc_id)
);

-- DID Alias 情報
CREATE TABLE IF NOT EXISTS wallet_app.did_aliases (
    wallet_id TEXT NOT NULL,
    did TEXT NOT NULL,
    alias TEXT NOT NULL,
    created_on TEXT,
    PRIMARY KEY (wallet_id, did)
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_walt_custom_accounts_email
    ON wallet_app.accounts (email);

CREATE INDEX IF NOT EXISTS idx_walt_custom_wallet_id
    ON wallet_app.account_wallets (wallet_id);

CREATE INDEX IF NOT EXISTS idx_walt_custom_oidc_id
    ON wallet_app.account_oidc_logins (oidc_id);

CREATE INDEX IF NOT EXISTS idx_walt_custom_did_alias_wallet
    ON wallet_app.did_aliases (wallet_id);

CREATE INDEX IF NOT EXISTS idx_walt_custom_did_alias_did
    ON wallet_app.did_aliases (did);
