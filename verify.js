
sudo apt update
sudo apt install -y curl xz-utils ca-certificates

cd /tmp

curl -fLO https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.xz

echo "1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce  node-v22.23.4-linux-x64.tar.xz" \
  | sha256sum -c -


sudo mkdir -p /opt/nodejs

sudo tar -xJf node-v22.23.4-linux-x64.tar.xz \
  -C /opt/nodejs


echo 'export PATH=/opt/nodejs/node-v22.23.4-linux-x64/bin:$PATH' \
  >> ~/.bashrc

source ~/.bashrc
hash -r




