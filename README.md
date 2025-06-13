
keytool -importcert \
  -alias did-web-demo \
  -file certs/server.crt \
  -keystore certs/truststore.jks \
  -storepass changeit \
  -noprompt

volumes:
  - ./verifier-api/config:/waltid-verifier-api/config
  - ./certs/truststore.jks:/etc/ssl/truststore.jks:ro
environment:
  - JAVA_TOOL_OPTIONS=-Djavax.net.ssl.trustStore=/etc/ssl/truststore.jks \
                       -Djavax.net.ssl.trustStorePassword=changeit
