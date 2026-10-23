
### 1.X 移行先データベースの既存データ確認・削除

移行先データベースに既存の移行対象データがある場合は、移行前に削除する。データが存在しない場合は、何も処理しない。

※ 実行前に移行先データベースのバックアップを取得すること。
※ `wallet2_` 関連テーブルのデータのみを削除する。

```bash
docker exec -e PGPASSWORD=waltid -i docker-compose-postgres-1 \
  psql -U waltid -d waltid <<'SQL'
DO $$
DECLARE
    table_list text;
BEGIN
    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'wallet2\_%' ESCAPE '\';

    IF table_list IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
        RAISE NOTICE '既存の wallet2 データを削除しました。';
    ELSE
        RAISE NOTICE '対象テーブルが存在しないため、処理をスキップしました。';
    END IF;
END $$;
SQL
```
