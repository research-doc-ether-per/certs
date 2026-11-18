-- * offerIdカラムを追加（デフォルト値：NULL）
ALTER TABLE add_cert
ADD COLUMN credential_offer_id VARCHAR(128) DEFAULT NULL;

-- * offerIdカラムを追加（デフォルト値：NULL）
ALTER TABLE org_add_cert
ADD COLUMN credential_offer_id VARCHAR(128) DEFAULT NULL;
