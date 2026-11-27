-- * Credential Offer関連カラムを追加
ALTER TABLE add_cert
    ADD COLUMN IF NOT EXISTS credential_offer_id VARCHAR(128) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS credential_offer_expires_at BIGINT DEFAULT NULL;

-- * 組織Credential Offer関連カラムを追加
ALTER TABLE org_add_cert
    ADD COLUMN IF NOT EXISTS credential_offer_id VARCHAR(128) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS credential_offer_expires_at BIGINT DEFAULT NULL;

-- * 既存データのCredential Offer有効期限を設定
--   Credential Offer URLが設定されている場合、
--   作成日時 + 5分をUnix Time（ミリ秒）として設定する。
UPDATE add_cert
SET credential_offer_expires_at =
    FLOOR(
        EXTRACT(EPOCH FROM (create_date + INTERVAL '5 minutes')) * 1000
    )::BIGINT
WHERE credential_offer_url IS NOT NULL
    AND credential_offer_expires_at IS NULL;

UPDATE org_add_cert
SET credential_offer_expires_at =
    FLOOR(
        EXTRACT(EPOCH FROM (create_date + INTERVAL '5 minutes')) * 1000
    )::BIGINT
WHERE credential_offer_url IS NOT NULL
    AND credential_offer_expires_at IS NULL;

-- * Issuer名のNOT NULL制約を解除
ALTER TABLE issuer
    ALTER COLUMN name DROP NOT NULL;

-- * Presentation Request URLテーブルにカラムを追加
ALTER TABLE presentation_request_url
    ADD COLUMN IF NOT EXISTS presentation_request_session_id VARCHAR(128) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS presentation_request_expires_at BIGINT DEFAULT NULL;

-- * 組織Presentation Request URLテーブルにカラムを追加
ALTER TABLE org_presentation_request_url
    ADD COLUMN IF NOT EXISTS presentation_request_session_id VARCHAR(128) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS presentation_request_expires_at BIGINT DEFAULT NULL;

-- * 既存データのPresentation Request URL有効期限を設定
--   Presentation Request URLが設定されている場合、
--   作成日時 + 5分をUnix Time（ミリ秒）として設定する。
UPDATE presentation_request_url
SET presentation_request_expires_at =
    FLOOR(
        EXTRACT(EPOCH FROM (create_date + INTERVAL '5 minutes')) * 1000
    )::BIGINT
WHERE presentation_request_url IS NOT NULL
    AND presentation_request_expires_at IS NULL;

UPDATE org_presentation_request_url
SET presentation_request_expires_at =
    FLOOR(
        EXTRACT(EPOCH FROM (create_date + INTERVAL '5 minutes')) * 1000
    )::BIGINT
WHERE presentation_request_url IS NOT NULL
    AND presentation_request_expires_at IS NULL;
