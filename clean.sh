#!/bin/bash
PROXY_URL=""
NO_PROXY_LIST="localhost,127.0.0.1,::1,10.0.2.15"
CERT_PATH="~/default_ca.crt"

if [ -f "$CERT_PATH" ]; then
  sudo cp "$CERT_PATH" /usr/local/share/ca-certificates/
  sudo update-ca-certificates
else
  echo "警告: CAファイル $CERT_PATH が見つかりません。証明書の更新をスキップします。"
fi

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

sudo tee -a ~/.bashrc > /dev/null <<EOF
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

yarn config set proxy "$PROXY_URL"
yarn config set https-proxy "$PROXY_URL"

npm config set proxy "$PROXY_URL"
npm config set https-proxy "$PROXY_URL"

sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=$PROXY_URL"
Environment="HTTPS_PROXY=$PROXY_URL"
Environment="NO_PROXY=$NO_PROXY_LIST"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

echo "プロキシと証明書の設定が完了しました。"
