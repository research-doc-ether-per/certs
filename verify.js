API 稼働中は単一の Pool を維持し、DB の一時停止時には無効となった Client のみを処理します。
Pool 自体は再作成せず、DB 復旧後に既存の Pool から新しい Client が作成されます。
Pool は API 終了時のみクローズします。

例①：API を再起動せず、DB のみ再起動する場合
DB 停止 → 既存 Client が無効化・削除される → 既存 Pool は保持される → DB 再起動 → 新しい Client が自動的に作成される → API を再起動せずに DB 処理が復旧する

例②：DB 停止後に API も停止し、その後 API と DB を再起動する場合
DB 停止 → 既存 Client が無効化される → API 停止 → shutdown 処理で pool.end() を実行 → 既存 Pool が終了する → API 再起動 → 新しい Pool が作成される → DB 再起動 → 新しい Client が作成される → DB 処理が復旧する
