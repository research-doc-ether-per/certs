FROM node:22-slim

LABEL org.opencontainers.image.title="cloud-issuer-api"

ENV NODE_ENV=production
ENV CONFIG_DIR=/app/services/issuer-api/config

WORKDIR /app

COPY ./services/issuer-api/package.json ./services/issuer-api/package.json
COPY ./services/issuer-api/package-lock.json ./services/issuer-api/package-lock.json

RUN cd ./services/issuer-api && npm ci --omit=dev && npm cache clean --force

COPY ./services/issuer-api ./services/issuer-api

RUN useradd -m -u 10001 appuser && mkdir -p /app/services/issuer-api/logs && chown -R appuser:appuser /app

USER appuser

WORKDIR /app/services/issuer-api

EXPOSE 6002

CMD ["npm", "start"]



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
      CONFIG_DIR: /app/services/issuer-api/config
    volumes:
      - ./config:/app/services/issuer-api/config:ro
      - ./runtime/logs:/app/services/issuer-api/logs
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
