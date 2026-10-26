CREATE TABLE cloud_wallet_db.priv_wallets (
    user_id VARCHAR(128) NOT NULL,
    account_id VARCHAR(128) NOT NULL,
    PRIMARY KEY (user_id, account_id)
);

CREATE INDEX idx_priv_wallets_account_id
    ON cloud_wallet_db.priv_wallets (account_id);


CREATE TABLE cloud_wallet_db.account_wallets (
    account_id VARCHAR(128) NOT NULL,
    wallet_id VARCHAR(128) NOT NULL,
    wallet_name VARCHAR(128),
    added_on TIMESTAMP,
    PRIMARY KEY (account_id, wallet_id)
);

CREATE INDEX idx_account_wallets_wallet_id
    ON cloud_wallet_db.account_wallets (wallet_id);


CREATE TABLE cloud_wallet_db.did_aliases (
    wallet_id VARCHAR(128) NOT NULL,
    did VARCHAR(1024) NOT NULL,
    alias VARCHAR(1024) NOT NULL,
    created_on TIMESTAMP,
    PRIMARY KEY (wallet_id, did)
);

CREATE INDEX idx_did_aliases_did
    ON cloud_wallet_db.did_aliases (did);
