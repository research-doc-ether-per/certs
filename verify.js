docker exec -e PGPASSWORD=waltid -it \
  docker-compose-postgres-1 \
  psql -U waltid -d postgres -c "\l"

docker exec -e PGPASSWORD=waltid -it \
  docker-compose-postgres-1 \
  psql -U waltid -d postgres \
  -c "CREATE DATABASE waltid_v0151_source OWNER waltid;"


docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  pg_restore -U waltid \
  -d waltid_v0151_source \
  --no-owner --no-acl --exit-on-error \
  < ./migration/v0151/waltid_v0151_full.dump


docker exec -e PGPASSWORD=waltid -it \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid_v0151_source \
  -c "SELECT COUNT(*) FROM public.accounts;"

// ----


docker exec -it docker-compose-postgres-1 \
  psql -U waltid -d postgres -c "\l"





docker exec -it docker-compose-postgres-1 \
  psql -U waltid -d postgres \
  -c "CREATE DATABASE waltid_v0151_source OWNER waltid;"


ls -lh ./migration/v0151/waltid_v0151_full.dump


docker exec -i docker-compose-postgres-1 \
  pg_restore \
  -U waltid \
  -d waltid_v0151_source \
  --no-owner \
  --no-acl \
  --exit-on-error \
  < ./migration/v0151/waltid_v0151_full.dump



docker exec -it docker-compose-postgres-1 \
  psql -U waltid -d waltid_v0151_source \
  -c "\dt public.*"

docker exec -i docker-compose-postgres-1 \
  psql -U waltid -d waltid_v0151_source \
  -c "
SELECT 'accounts' AS table_name, COUNT(*) FROM public.accounts
UNION ALL
SELECT 'wallets', COUNT(*) FROM public.wallets
UNION ALL
SELECT 'wallet_keys', COUNT(*) FROM public.wallet_keys
UNION ALL
SELECT 'wallet_dids', COUNT(*) FROM public.wallet_dids
UNION ALL
SELECT 'credentials', COUNT(*) FROM public.credentials
UNION ALL
SELECT 'account_wallet_mapping', COUNT(*)
FROM public.account_wallet_mapping;
"
