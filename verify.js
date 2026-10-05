issuer-valkey:
  image: valkey/valkey:${VERSION_VALKEY:-7.2}
  profiles:
    - identity
  container_name: issuer-valkey
  healthcheck:
    test: [ "CMD", "valkey-cli", "-p", "${ISSUER_VALKEY_PORT}", "ping" ]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 5s
  restart: always
  command: ["valkey-server", "--bind", "0.0.0.0", "--port", "${ISSUER_VALKEY_PORT}"]
  ports:
    - "${ISSUER_VALKEY_PORT}:${ISSUER_VALKEY_PORT}"
  volumes:
    - issuer_valkey_data:/data

verifier-valkey:
  image: valkey/valkey:${VERSION_VALKEY:-7.2}
  profiles:
    - identity
  container_name: verifier-valkey
  healthcheck:
    test: [ "CMD", "valkey-cli", "-p", "${VERIFIER_VALKEY_PORT}", "ping" ]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 5s
  restart: always
  command: ["valkey-server", "--bind", "0.0.0.0", "--port", "${VERIFIER_VALKEY_PORT}"]
  ports:
    - "${VERIFIER_VALKEY_PORT}:${VERIFIER_VALKEY_PORT}"
  volumes:
    - verifier_valkey_data:/data

volumes:
  issuer_valkey_data:
  verifier_valkey_data:



issuer-api2:
  image: ${IMAGE_PREFIX}waltid/issuer-api2:${VERSION_TAG:-latest}
  profiles:
    - services
    - identity
    - all
  pull_policy: missing
  depends_on:
    caddy:
      condition: service_started
    issuer-valkey:
      condition: service_healthy
  env_file:
    - .env
  extra_hosts:
    - "$SERVICE_HOST:host-gateway"
  volumes:
    - ./issuer-api2/config:/waltid-issuer-api2/config
