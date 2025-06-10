#!/bin/bash

# 使用第一个参数作为 .env 文件路径，默认为 ./.env
ENV_FILE=${1:-"./.env"}
KEY="NOPROXY"
VALUE="localhost,127.0.0.1"

# 检查文件是否存在
if [ ! -f "$ENV_FILE" ]; then
  echo "指定された.envファイルが見つかりません: $ENV_FILE"
  exit 1
fi

# 如果存在，先删除原有 NOPROXY 行
if grep -q "^$KEY=" "$ENV_FILE"; then
  sed -i.bak "/^$KEY=/d" "$ENV_FILE"
fi

# 添加新的 NOPROXY 设置
echo "$KEY=$VALUE" >> "$ENV_FILE"

echo "$KEY を $ENV_FILE に設定しました。"
