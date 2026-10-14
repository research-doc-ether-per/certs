sudo apt update
sudo apt install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v


grep -Rni "dl.yarnpkg.com" \
  /etc/apt/sources.list \
  /etc/apt/sources.list.d/ 2>/dev/null


sudo rm /etc/apt/sources.list.d/yarn.list
