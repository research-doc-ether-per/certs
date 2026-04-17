#!/bin/bash

PROXY_URL=""
NO_PROXY_LIST="localhost,127.0.0.1,::1,10.0.2.15"
CERT_PATH="$HOME/default_ca.crt"
SYSTEM_CERT_PATH="/usr/local/share/ca-certificates/default_ca.crt"

if [ ! -f "$CERT_PATH" ]; then
  echo "警告: CAファイル $CERT_PATH が見つかりません。"
  exit 1
fi

sudo cp "$CERT_PATH" "$SYSTEM_CERT_PATH"
sudo update-ca-certificates

sudo tee /etc/environment > /dev/null <<EOF
http_proxy="$PROXY_URL"
https_proxy="$PROXY_URL"
ftp_proxy="$PROXY_URL"
HTTP_PROXY="$PROXY_URL"
HTTPS_PROXY="$PROXY_URL"
FTP_PROXY="$PROXY_URL"
NO_PROXY="$NO_PROXY_LIST"
no_proxy="$NO_PROXY_LIST"
EOF

grep -q 'http_proxy=' "$HOME/.bashrc" && sed -i '/http_proxy=/d;/https_proxy=/d;/ftp_proxy=/d;/HTTP_PROXY=/d;/HTTPS_PROXY=/d;/FTP_PROXY=/d;/NO_PROXY=/d;/no_proxy=/d' "$HOME/.bashrc"

tee -a "$HOME/.bashrc" > /dev/null <<EOF
export http_proxy="$PROXY_URL"
export https_proxy="$PROXY_URL"
export ftp_proxy="$PROXY_URL"
export HTTP_PROXY="$PROXY_URL"
export HTTPS_PROXY="$PROXY_URL"
export FTP_PROXY="$PROXY_URL"
export NO_PROXY="$NO_PROXY_LIST"
export no_proxy="$NO_PROXY_LIST"
EOF

git config --global http.proxy "$PROXY_URL"
git config --global https.proxy "$PROXY_URL"
git config --global http.sslCAInfo "$SYSTEM_CERT_PATH"

npm config set proxy "$PROXY_URL"
npm config set https-proxy "$PROXY_URL"
npm config set cafile "$SYSTEM_CERT_PATH"
npm config set strict-ssl true

yarn config set proxy "$PROXY_URL"
yarn config set https-proxy "$PROXY_URL"
yarn config set cafile "$SYSTEM_CERT_PATH"

sudo mkdir -p /etc/apt/apt.conf.d
sudo tee /etc/apt/apt.conf.d/95proxy > /dev/null <<EOF
Acquire::http::Proxy "$PROXY_URL";
Acquire::https::Proxy "$PROXY_URL";
EOF

sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=$PROXY_URL"
Environment="HTTPS_PROXY=$PROXY_URL"
Environment="NO_PROXY=$NO_PROXY_LIST"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

echo "プロキシ、証明書、各種設定の反映が完了しました。"
