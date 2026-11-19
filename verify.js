-- * Credential Offerの有効期限カラムを追加（デフォルト値：NULL）
ALTER TABLE add_cert
ADD COLUMN IF NOT EXISTS credential_offer_expires_at BIGINT DEFAULT NULL;

ALTER TABLE org_add_cert
ADD COLUMN IF NOT EXISTS credential_offer_expires_at BIGINT DEFAULT NULL;


-- * 既存データのCredential Offer有効期限を設定
--   Credential Offer URLが設定されている場合、
--   作成日時 + 5分をUnix time（ミリ秒）として設定
UPDATE add_cert
SET credential_offer_expires_at =
    (
        EXTRACT(
            EPOCH FROM (create_date + INTERVAL '5 minutes')
        ) * 1000
    )::BIGINT
WHERE credential_offer_url IS NOT NULL
  AND credential_offer_expires_at IS NULL;

UPDATE org_add_cert
SET credential_offer_expires_at =
    (
        EXTRACT(
            EPOCH FROM (create_date + INTERVAL '5 minutes')
        ) * 1000
    )::BIGINT
WHERE credential_offer_url IS NOT NULL
  AND credential_offer_expires_at IS NULL;
