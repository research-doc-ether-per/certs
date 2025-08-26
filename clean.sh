# 1) 为 docker.service 写 systemd drop-in（守护进程代理）
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.local,.internal"
EOF

# 2) 重新加载并重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# 3) 验证守护进程是否吃到环境变量（必须看到三项）
systemctl show docker -p Environment

