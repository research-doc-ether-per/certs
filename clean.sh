#!/bin/bash

BASHRC_PATH="$HOME/.bashrc"
NPMRC_USER="$HOME/.npmrc"
YARNRC_USER="$HOME/.yarnrc"
YARNRCYML_USER="$HOME/.yarnrc.yml"
NPMRC_PROJECT=".npmrc"
YARNRC_PROJECT=".yarnrc"
YARNRCYML_PROJECT=".yarnrc.yml"
DOCKER_PROXY_CONF="/etc/systemd/system/docker.service.d/http-proxy.conf"
APT_PROXY_CONF="/etc/apt/apt.conf.d/95proxy"
SYSTEM_CERT_PATH="/usr/local/share/ca-certificates/default_ca.crt"

unset http_proxy https_proxy ftp_proxy HTTP_PROXY HTTPS_PROXY FTP_PROXY NO_PROXY no_proxy

sudo sed -i '/^http_proxy=/d;/^https_proxy=/d;/^ftp_proxy=/d;/^HTTP_PROXY=/d;/^HTTPS_PROXY=/d;/^FTP_PROXY=/d;/^NO_PROXY=/d;/^no_proxy=/d' /etc/environment

if [ -f "$BASHRC_PATH" ]; then
  sed -i '/export http_proxy=/d;/export https_proxy=/d;/d;/export HTTP_PROXY=/d;/export HTTPS_PROXY=/d;/export FTP_PROXY=/d;/export NO_PROXY=/d;/export no_proxy=/d' "$BASHRC_PATH"
fi

git config --global --unset http.proxy 2>/dev/null || true
git config --global --unset https.proxy 2>/dev/null || true
git config --global --unset http.sslCAInfo 2>/dev/null || true

npm config delete proxy 2>/dev/null || true
npm config delete https-proxy 2>/dev/null || true
npm config delete cafile 2>/dev/null || true
npm config delete strict-ssl 2>/dev/null || true

if [ -f "$NPMRC_USER" ]; then
  sed -i '/^proxy=/d;/^https-proxy=/d;/^cafile=/d;/^strict-ssl=/d' "$NPMRC_USER"
fi

if [ -f "$NPMRC_PROJECT" ]; then
  sed -i '/^proxy=/d;/^https-proxy=/d;/^cafile=/d;/^strict-ssl=/d' "$NPMRC_PROJECT"
fi

yarn config delete proxy 2>/dev/null || true
yarn config delete https-proxy 2>/dev/null || true
yarn config delete cafile 2>/dev/null || true

if [ -f "$YARNRC_USER" ]; then
  sed -i '/^proxy /d;/^https-proxy /d;/^cafile /d' "$YARNRC_USER"
fi

if [ -f "$YARNRC_PROJECT" ]; then
  sed -i '/^proxy /d;/^https-proxy /d;/^cafile /d' "$YARNRC_PROJECT"
fi

if [ -f "$YARNRCYML_USER" ]; then
  sed -i '/^httpProxy:/d;/^httpsProxy:/d;/^caFilePath:/d' "$YARNRCYML_USER"
fi

if [ -f "$YARNRCYML_PROJECT" ]; then
  sed -i '/^httpProxy:/d;/^httpsProxy:/d;/^caFilePath:/d' "$YARNRCYML_PROJECT"
fi

if [ -f "$APT_PROXY_CONF" ]; then
  sudo rm -f "$APT_PROXY_CONF"
fi

if [ -f "$DOCKER_PROXY_CONF" ]; then
  sudo rm -f "$DOCKER_PROXY_CONF"
fi

if [ -f "$SYSTEM_CERT_PATH" ]; then
  sudo rm -f "$SYSTEM_CERT_PATH"
  sudo update-ca-certificates --fresh
fi

sudo systemctl daemon-reload
sudo systemctl restart docker

echo "プロキシ設定と証明書設定の削除が完了しました。"
