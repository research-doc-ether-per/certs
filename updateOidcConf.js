version: "3.9"

services:
  issuer-api:
    # start-verified の場合は IMAGE_DIGEST が優先される
    image: ${IMAGE_DIGEST:-${FULL_IMAGE_NAME}}

    container_name: cloud-issuer-api
    ports:
      - "6002:6002"

    environment:
      NODE_ENV: production

    volumes:
      - ./config/.env:/app/services/issuer-api/.env:ro
      - ./config/keycloak.json:/app/services/issuer-api/config/keycloak.json:ro
      - ./config/log4js.json:/app/services/issuer-api/config/log4js.json:ro
      - ./config/server.json:/app/services/issuer-api/config/server.json:ro
      - ./config/vcTemplate.json:/app/services/issuer-api/config/vcTemplate.json:ro
      - ./config/walletDB.json:/app/services/issuer-api/config/walletDB.json:ro
      - ./config/waltid.json:/app/services/issuer-api/config/waltid.json:ro
      - ./runtime/logs:/app/services/issuer-api/logs

    read_only: true
    tmpfs:
      - /tmp

    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:6002/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
        ]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 20s

    restart: unless-stopped
