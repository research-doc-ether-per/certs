
CREATE SCHEMA IF NOT EXISTS wallet_app;

-- アカウント情報
CREATE TABLE IF NOT EXISTS wallet_app.accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    password_hash TEXT,
    created_on TEXT,
    raw JSONB NOT NULL
);

-- アカウントと Wallet の権限情報
CREATE TABLE IF NOT EXISTS wallet_app.account_wallet_permissions (
    account_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    permissions TEXT,
    added_on TEXT,
    raw JSONB NOT NULL,
    PRIMARY KEY (account_id, wallet_id)
);

-- OIDC ログイン情報
CREATE TABLE IF NOT EXISTS wallet_app.account_oidc_logins (
    account_id TEXT NOT NULL,
    oidc_id TEXT NOT NULL,
    raw JSONB NOT NULL,
    PRIMARY KEY (account_id, oidc_id)
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_walt_custom_accounts_email
    ON wallet_app.accounts (email);

CREATE INDEX IF NOT EXISTS idx_walt_custom_perm_wallet
    ON wallet_app.account_wallet_permissions (wallet_id);

CREATE INDEX IF NOT EXISTS idx_walt_custom_oidc_id
    ON wallet_app.account_oidc_logins (oidc_id);
