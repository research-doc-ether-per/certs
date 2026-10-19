
# バックアップ用ディレクトリを作成
mkdir -p ./migration/v0151

# データベース全体をバックアップ
docker exec -e PGPASSWORD=waltid -i docker-compose-postgres-1 \
  pg_dump -U waltid -d waltid -Fc \
  > ./migration/v0151/waltid_v0151_full.dump

# テーブル構造をエクスポート
docker exec -e PGPASSWORD=waltid -i docker-compose-postgres-1 \
  pg_dump -U waltid -d waltid --schema-only \
  > ./migration/v0151/waltid_v0151_schema.sql

# データをエクスポート
docker exec -e PGPASSWORD=waltid -i docker-compose-postgres-1 \
  pg_dump -U waltid -d waltid --data-only --inserts \
  > ./migration/v0151/waltid_v0151_data.sql
