docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid \
  -c "
SELECT 'wallets' AS table_name, COUNT(*) FROM public.wallet2_wallets
UNION ALL
SELECT 'keys', COUNT(*) FROM public.wallet2_keys
UNION ALL
SELECT 'dids', COUNT(*) FROM public.wallet2_dids
UNION ALL
SELECT 'credentials', COUNT(*) FROM public.wallet2_credentials
UNION ALL
SELECT 'account_wallet_mapping', COUNT(*)
FROM public.wallet2_account_wallets;
"
