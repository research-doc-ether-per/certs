-- * 追加可能証明書テーブル
ALTER TABLE add_cert
ADD COLUMN credential_offer_id VARCHAR(128) DEFAULT NULL;

-- * 組織追加可能証明書対象者テーブル
ALTER TABLE org_add_cert
ADD COLUMN credential_offer_id VARCHAR(128) DEFAULT NULL;
