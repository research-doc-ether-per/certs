#!/bin/bash

PROXY_URL=""
CERT_PATH="$HOME/default_ca.crt"
SYSTEM_CERT_PATH="/usr/local/share/ca-certificates/default_ca.crt"
DOCKER_PROXY_CONF="/etc/systemd/system/docker.service.d/http-proxy.conf"
APT_PROXY_CONF="/etc/apt/apt.conf.d/95proxy"

echo "===== 確認開始 ====="
echo

echo "[1] CAファイル確認"
if [ -f "$CERT_PATH" ]; then
  echo "OK: $CERT_PATH が存在します。"
else
  echo "NG: $CERT_PATH が見つかりません。"
fi

if [ -f "$SYSTEM_CERT_PATH" ]; then
  echo "OK: $SYSTEM_CERT_PATH が存在します。"
else
  echo "NG: $SYSTEM_CERT_PATH が見つかりません。"
fi

if ls -l /etc/ssl/certs 2>/dev/null | grep -q "default_ca"; then
  echo "OK: /etc/ssl/certs 配下に default_ca のリンクまたはファイルがあります。"
else
  echo "NG: /etc/ssl/certs 配下に default_ca のリンクまたはファイルが見つかりません。"
fi

echo
echo "[2] Dockerプロキシ設定ファイル確認"
if [ -f "$DOCKER_PROXY_CONF" ]; then
  echo "OK: $DOCKER_PROXY_CONF が存在します。"
  cat "$DOCKER_PROXY_CONF"
else
  echo "NG: $DOCKER_PROXY_CONF が見つかりません。"
fi

echo
echo "[3] Dockerサービス環境変数確認"
if command -v systemctl >/dev/null 2>&1; then
  systemctl show --property=Environment docker
else
  echo "NG: systemctl コマンドが見つかりません。"
fi

echo
echo "[4] Dockerサービス定義確認"
if command -v systemctl >/dev/null 2>&1; then
  systemctl cat docker 2>/dev/null | grep -A 5 -B 2 "http-proxy.conf" || echo "NG: docker に http-proxy.conf の読み込みが確認できません。"
else
  echo "NG: systemctl コマンドが見つかりません。"
fi

echo
echo "[5] Git設定確認"
if command -v git >/dev/null 2>&1; then
  echo "http.proxy  : $(git config --global --get http.proxy)"
  echo "https.proxy : $(git config --global --get https.proxy)"
  echo "http.sslCAInfo : $(git config --global --get http.sslCAInfo)"
else
  echo "NG: git コマンドが見つかりません。"
fi

echo
echo "[6] npm設定確認"
if command -v npm >/dev/null 2>&1; then
  echo "proxy      : $(npm config get proxy 2>/dev/null)"
  echo "https-proxy: $(npm config get https-proxy 2>/dev/null)"
  echo "cafile     : $(npm config get cafile 2>/dev/null)"
  echo "strict-ssl : $(npm config get strict-ssl 2>/dev/null)"
else
  echo "NG: npm コマンドが見つかりません。"
fi

echo
echo "[7] yarn設定確認"
if command -v yarn >/dev/null 2>&1; then
  echo "proxy      : $(yarn config get proxy 2>/dev/null)"
  echo "https-proxy: $(yarn config get https-proxy 2>/dev/null)"
  echo "cafile     : $(yarn config get cafile 2>/dev/null)"
else
  echo "NG: yarn コマンドが見つかりません。"
fi

echo
echo "[8] apt設定確認"
if [ -f "$APT_PROXY_CONF" ]; then
  echo "OK: $APT_PROXY_CONF が存在します。"
  cat "$APT_PROXY_CONF"
else
  echo "NG: $APT_PROXY_CONF が見つかりません。"
fi

echo
echo "[9] curl疎通確認"
if command -v curl >/dev/null 2>&1; then
  timeout 20 curl -I -x "$PROXY_URL" https://www.google.com >/tmp/proxy_curl_check.log 2>&1
  if [ $? -eq 0 ]; then
    echo "OK: curl によるプロキシ疎通確認に成功しました。"
    head -n 5 /tmp/proxy_curl_check.log
  else
    echo "NG: curl によるプロキシ疎通確認に失敗しました。"
    cat /tmp/proxy_curl_check.log
  fi
else
  echo "NG: curl コマンドが見つかりません。"
fi

echo
echo "[10] docker pull確認"
if command -v docker >/dev/null 2>&1; then
  timeout 60 docker pull hello-world >/tmp/docker_pull_check.log 2>&1
  if [ $? -eq 0 ]; then
    echo "OK: docker pull hello-world に成功しました。"
    tail -n 10 /tmp/docker_pull_check.log
  else
    echo "NG: docker pull hello-world に失敗しました。"
    cat /tmp/docker_pull_check.log
  fi
else
  echo "NG: docker コマンドが見つかりません。"
fi

echo
echo "[11] /etc/environment確認"
if [ -f /etc/environment ]; then
  grep -E 'http_proxy|https_proxy|ftp_proxy|HTTP_PROXY|HTTPS_PROXY|FTP_PROXY|NO_PROXY|no_proxy' /etc/environment || echo "NG: /etc/environment に対象設定が見つかりません。"
else
  echo "NG: /etc/environment が見つかりません。"
fi

echo
echo "[12] ~/.bashrc確認"
if [ -f "$HOME/.bashrc" ]; then
  grep -E 'http_proxy|https_proxy|ftp_proxy|HTTP_PROXY|HTTPS_PROXY|FTP_PROXY|NO_PROXY|no_proxy' "$HOME/.bashrc" || echo "NG: ~/.bashrc に対象設定が見つかりません。"
else
  echo "NG: ~/.bashrc が見つかりません。"
fi

echo
echo "===== 確認終了 ====="
