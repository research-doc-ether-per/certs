#!/bin/bash

start_time=$(date '+%Y-%m-%d %H:%M:%S')
start_ts=$(date +%s)

echo "Docker Compose起動前の時刻: ${start_time}"

docker compose up -d

end_time=$(date '+%Y-%m-%d %H:%M:%S')
end_ts=$(date +%s)

echo "Docker Compose起動後の時刻: ${end_time}"

duration=$((end_ts - start_ts))
minutes=$((duration / 60))
seconds=$((duration % 60))

echo "所要時間: ${minutes}分${seconds}秒"
