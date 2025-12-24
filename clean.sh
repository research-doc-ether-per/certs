ローカル環境で確認を行いましたが、現時点では特に気になる点は見当たりませんでした。
1. react-server-dom 系の依存は未インストール。（npm / package-lock.json ともに該当なし）
2．use server、route.ts / route.js、API Routes などのサーバー側要素は見当たらない
3．child_process / exec / eval 等の使用もなし
4．実行中プロセス・CPU負荷・ネットワーク通信に不審点なし
5．マイニング系プロセスや不審な一時ファイルも確認されない
確認された対象やログは以下に置きました。ご確認お願い致します。
