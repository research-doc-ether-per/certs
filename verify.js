
-- 移行対象データの件数を確認する
SELECT 'accounts' AS table_name, COUNT(*) AS count FROM accounts
UNION ALL
SELECT 'account_wallet_mapping', COUNT(*) FROM account_wallet_mapping
UNION ALL
SELECT 'wallets', COUNT(*) FROM wallets
UNION ALL
SELECT 'wallet_keys', COUNT(*) FROM wallet_keys
UNION ALL
SELECT 'wallet_dids', COUNT(*) FROM wallet_dids
UNION ALL
SELECT 'credentials', COUNT(*) FROM credentials
UNION ALL
SELECT 'category', COUNT(*) FROM category
UNION ALL
SELECT 'credential_category', COUNT(*) FROM credential_category;



-- Credentialのフォーマット別件数を確認する
SELECT
  format,
  COUNT(*) AS count
FROM credentials
GROUP BY format
ORDER BY format;


-- 旧バージョンのKeyデータ形式を確認する
SELECT
  wallet,
  kid,
  LENGTH(document) AS document_length,
  LEFT(LTRIM(document), 1) AS document_prefix
FROM wallet_keys
LIMIT 10;

-- Credentialデータ形式を確認する
SELECT
  wallet,
  id,
  format,
  LENGTH(document) AS document_length,
  LEFT(LTRIM(document), 1) AS document_prefix,
  disclosures IS NOT NULL AS has_disclosures
FROM credentials
LIMIT 10;


-- KeyのJSONフィールド構造を確認する
SELECT DISTINCT
  jsonb_object_keys(document::jsonb) AS key_name
FROM wallet_keys
ORDER BY key_name;



-- Credentialの保存形式を確認する
SELECT
  format,
  LEFT(document, 20) AS document_prefix,
  LENGTH(document) AS document_length,
  LENGTH(disclosures) AS disclosures_length,
  LEFT(LTRIM(disclosures), 1) AS disclosures_prefix
FROM credentials
ORDER BY format;

