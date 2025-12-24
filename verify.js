
mkdir -p docker/issuer-api/config
mkdir -p docker/issuer-api/runtime/logs

// docker/issuer-api/compose.dev.yml
services:
  issuer-api:
    image: cloud-issuer-api:dev
    container_name: cloud-issuer-api-dev
    build:
      context: ../..
      dockerfile: docker/issuer-api/Dockerfile
    ports:
      - "6002:6002"
    environment:
      NODE_ENV: development
      CONFIG_DIR: /app/config
    volumes:
      - ./config:/app/config:ro
      - ./runtime/logs:/app/services/issuer-api/logs
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL


// docker/issuer-api/compose.prod.yml
services:
  issuer-api:
    image: cloud-issuer-api:${TAG}
    container_name: cloud-issuer-api
    build:
      context: ../..
      dockerfile: docker/issuer-api/Dockerfile
    ports:
      - "6002:6002"
    environment:
      NODE_ENV: production
      CONFIG_DIR: /app/config
    volumes:
      - ./config:/app/config:ro
      - ./runtime/logs:/app/services/issuer-api/logs
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

// docker/issuer-api/Dockerfile
FROM node:22-slim

LABEL org.opencontainers.image.title="cloud-issuer-api"

ENV NODE_ENV=production
ENV CONFIG_DIR=/app/config

WORKDIR /app

COPY ./services/issuer-api/package.json ./services/issuer-api/package.json
COPY ./services/issuer-api/package-lock.json ./services/issuer-api/package-lock.json

RUN cd ./services/issuer-api \
  && npm ci --omit=dev \
  && npm cache clean --force

COPY ./services/issuer-api ./services/issuer-api
RUN rm -rf /app/services/issuer-api/config || true

RUN useradd -m -u 10001 appuser \
  && mkdir -p /app/services/issuer-api/logs \
  && chown -R appuser:appuser /app

USER appuser

WORKDIR /app/services/issuer-api

EXPOSE 6002

CMD ["npm", "start"]

// build
docker build -f docker/issuer-api/Dockerfile -t cloud-issuer-api:dev .
// start
docker compose -f docker/issuer-api/compose.dev.yml up -d
docker compose -f docker/issuer-api/compose.dev.yml restart


TAG="sha-$(git rev-parse --short HEAD)"
docker build -f docker/issuer-api/Dockerfile -t cloud-issuer-api:${TAG} .
ISSUER_API_TAG="${TAG}" docker compose -f docker/issuer-api/compose.prod.yml up -d

