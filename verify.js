-- * Credential Offerの有効期限カラムを追加（デフォルト値：NULL）
ALTER TABLE add_cert
ADD COLUMN credential_offer_expires_at BIGINT DEFAULT NULL;

-- * Credential Offerの有効期限カラムを追加（デフォルト値：NULL）
ALTER TABLE org_add_cert
ADD COLUMN credential_offer_expires_at BIGINT DEFAULT NULL;


 credential_offer_expires_at BIGINT DEFAULT NULL,
