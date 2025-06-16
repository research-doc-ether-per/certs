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
