
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'priv_wallets'
ORDER BY ordinal_position;

SELECT
    a.attname AS column_name
FROM pg_constraint c
JOIN pg_class t
    ON t.oid = c.conrelid
JOIN pg_namespace n
    ON n.oid = t.relnamespace
JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    ON TRUE
JOIN pg_attribute a
    ON a.attrelid = t.oid
    AND a.attnum = k.attnum
WHERE n.nspname = 'public'
  AND t.relname = 'priv_wallets'
  AND c.contype = 'p'
ORDER BY k.ord;
