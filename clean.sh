#!/usr/bin/env bash
set -e

echo "清理 APT 缓存..."
sudo apt-get clean
sudo apt-get autoremove --purge -y

echo "清理 Snap 旧版本..."
snap list --all \
  | awk '/disabled/{print $1, $2}' \
  | xargs -rn2 sudo snap remove || true

echo "清理 systemd 日志（保留最近 100M 日志）..."
# sudo journalctl --vacuum-time=2d
sudo journalctl --vacuum-size=100M

echo "删除 /var/log 旧日志..."
sudo find /var/log -type f \( -name "*.gz" -o -name "*.[0-9]" \) -delete

echo "清理用户级缓存..."
rm -rf ~/.cache/thumbnails/* ~/.cache/*

echo "释放内存页缓存..."
sudo sync && sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

echo "（如果装了 Docker）清理 Docker 垃圾..."
docker system prune -a --volumes -f || true

echo "全部清理完毕！"
