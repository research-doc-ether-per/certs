services:
  wallet-db:
    image: postgres:16.2-alpine
    container_name: wallet-db
    env_file:
      - .env

    volumes:
      - wallet-db-data:/var/lib/postgresql/data
      - ./initdb:/docker-entrypoint-initdb.d:ro

    ports:
      - "5433:5432"

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

    restart: unless-stopped
    stop_grace_period: 30s

    logging:
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  wallet-db-data:
