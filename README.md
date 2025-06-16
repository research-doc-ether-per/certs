openssl s_client -connect host.docker.internal:3201 -servername host.docker.internal -showcerts
openssl x509 -noout -text -in server.crt | grep DNS


mkcert -install
mkcert host.docker.internal

docker cp "$(mkcert -CAROOT)/rootCA.pem" verifier:/tmp/rootCA.pem

docker exec -it verifier bash -c \
  "keytool -importcert -alias localCA \
   -file /tmp/rootCA.pem \
   -keystore \$JAVA_HOME/lib/security/cacerts \
   -storepass changeit -noprompt"

environment:
  - JAVA_TOOL_OPTIONS=-Dcom.sun.net.ssl.checkRevocation=false \
      -Djdk.internal.httpclient.disableHostnameVerification

quarkus.http.ssl-trust-all=true
quarkus.vertx.disable-hostname-verification=true


mkcert -cert-file server.crt -key-file server.key \
  host.docker.internal 127.0.0.1 ::1

——————————————————————————————————————————————————

openssl genrsa -out rootCA.key 4096
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 \
  -subj "/C=JP/O=Local Dev/CN=Local Dev Root CA" \
  -out rootCA.pem


openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=host.docker.internal"


cat > san.ext <<EOF
subjectAltName = @alt_names
[alt_names]
DNS.1 = host.docker.internal
IP.1  = 127.0.0.1
IP.2  = ::1
EOF

openssl x509 -req -in server.csr -CA rootCA.pem -CAkey rootCA.key \
  -CAcreateserial -out server.crt -days 825 -sha256 -extfile san.ext
————————————————————————
COPY docker-compose/verifier-api/rootCA.pem /tmp/rootCA.pem
RUN keytool -importcert -alias local-dev-ca \
   -file /tmp/rootCA.pem \
   -keystore $JAVA_HOME/lib/security/cacerts \
   -storepass changeit -noprompt && \
   rm /tmp/rootCA.pem
