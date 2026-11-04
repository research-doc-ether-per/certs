-- * Credential Offer URLの有効期間（秒）を追加
ALTER TABLE add_cert ADD COLUMN credential_offer_expiration_seconds INTEGER DEFAULT NULL;


docker exec -i wallet-db psql -U postgres -d walletdb -v ON_ERROR_STOP=1 < docker/wallet-db/initdb/03-alter.sql
