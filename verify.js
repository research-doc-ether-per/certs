
issuer-api2-1:
  image: ${IMAGE_PREFIX}waltid/issuer-api2:${VERSION_TAG:-latest}
  profiles:
    - services
    - identity
    - all
  pull_policy: missing
  depends_on:
    issuer-valkey-1:
      condition: service_healthy
  env_file:
    - .env
  extra_hosts:
    - "$SERVICE_HOST:host-gateway"
  volumes:
    - ./issuer-api2-1/config:/waltid-issuer-api2/config
  ports:
    - "${ISSUER_API2_1_PORT}:7005"

issuer-api2-2:
  image: ${IMAGE_PREFIX}waltid/issuer-api2:${VERSION_TAG:-latest}
  profiles:
    - services
    - identity
    - all
  pull_policy: missing
  depends_on:
    issuer-valkey-2:
      condition: service_healthy
  env_file:
    - .env
  extra_hosts:
    - "$SERVICE_HOST:host-gateway"
  volumes:
    - ./issuer-api2-2/config:/waltid-issuer-api2/config
  ports:
    - "${ISSUER_API2_2_PORT}:7005"

issuer-valkey-1:
  image: valkey/valkey:${VERSION_VALKEY:-7.2}
  container_name: issuer-valkey-1
  restart: always
  command:
    [
      "valkey-server",
      "--bind",
      "0.0.0.0",
      "--port",
      "${ISSUER_VALKEY_1_PORT}"
    ]
  healthcheck:
    test: [ "CMD", "valkey-cli", "-p", "${ISSUER_VALKEY_1_PORT}", "ping" ]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 5s
  ports:
    - "${ISSUER_VALKEY_1_PORT}:${ISSUER_VALKEY_1_PORT}"
  volumes:
    - issuer_valkey_1_data:/data

issuer-valkey-2:
  image: valkey/valkey:${VERSION_VALKEY:-7.2}
  container_name: issuer-valkey-2
  restart: always
  command:
    [
      "valkey-server",
      "--bind",
      "0.0.0.0",
      "--port",
      "${ISSUER_VALKEY_2_PORT}"
    ]
  healthcheck:
    test: [ "CMD", "valkey-cli", "-p", "${ISSUER_VALKEY_2_PORT}", "ping" ]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 5s
  ports:
    - "${ISSUER_VALKEY_2_PORT}:${ISSUER_VALKEY_2_PORT}"
  volumes:
    - issuer_valkey_2_data:/data



ISSUER_API2_1_PORT=7005
ISSUER_API2_2_PORT=7015

ISSUER_VALKEY_1_HOST=10.0.2.15
ISSUER_VALKEY_1_PORT=6380

ISSUER_VALKEY_2_HOST=10.0.2.15
ISSUER_VALKEY_2_PORT=6382
