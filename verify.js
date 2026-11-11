
CREATE TABLE wallet_aliases (
    waltid_wallet_id VARCHAR(128) NOT NULL,
    wallet_name VARCHAR(128),
    added_on TIMESTAMP,
    PRIMARY KEY (wallet_id)
);

CREATE TABLE did_aliases (
    waltid_wallet_id VARCHAR(128) NOT NULL,
    did VARCHAR(1024) NOT NULL,
    alias VARCHAR(1024) NOT NULL,
    created_on TIMESTAMP,
    PRIMARY KEY (wallet_id, did)
);


-- Cloud Wallet の個人ウォレットIDのデータ型を変更
-- walt.id v1.0.0 の Wallet ID に対応するため、UUID から VARCHAR(128) に変更
ALTER TABLE priv_wallets
ALTER COLUMN waltid_wallet TYPE VARCHAR(128)
USING waltid_wallet::text;
