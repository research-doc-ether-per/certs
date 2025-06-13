# 1. 生成 2048 位 RSA 私钥 key.pem
openssl genrsa -out key.pem 2048

# 2. 生成 CSR（Certificate Signing Request）server.csr
openssl req -new \
  -key key.pem \
  -out server.csr \
  -subj "/C=CN/ST=Tokyo/L=Chiyoda-ku/O=YourOrg/OU=YourUnit/CN=localhost"

# 3. 用私钥 self-sign 生成有效期 1 年的自签证书 server.crt
openssl x509 -req \
  -in server.csr \
  -signkey key.pem \
  -days 365 \
  -out server.crt
