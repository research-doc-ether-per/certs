# Linter toggles
USE_HADOLINT=${USE_HADOLINT:-true}
USE_COMPOSE_CONFIG_LINT=${USE_COMPOSE_CONFIG_LINT:-true}

# Hadolint config (optional)
HADOLINT_CONFIG=${HADOLINT_CONFIG:-".hadolint.yaml"}   
HADOLINT_IMAGE=${HADOLINT_IMAGE:-"hadolint/hadolint:latest"}

# Compose command (v2)
DOCKER_COMPOSE_BIN=${DOCKER_COMPOSE_BIN:-"docker compose"}

  # (A) hadolint (Dockerfile linter)
  if [ "$USE_HADOLINT" = "true" ]; then
    if [ -f "$HADOLINT_CONFIG" ]; then
      info "Hadolint: $f (config: $HADOLINT_CONFIG)"
      if ! docker run --rm -i -v "$(pwd)/$HADOLINT_CONFIG:/.hadolint.yaml:ro" "$HADOLINT_IMAGE" \
        hadolint -f tty -c /.hadolint.yaml - < "$f"; then
        error "[LINT] hadolint failed: $f"
      fi
    else
      info "Hadolint: $f"
      if ! docker run --rm -i "$HADOLINT_IMAGE" hadolint -f tty - < "$f"; then
        error "[LINT] hadolint failed: $f"
      fi
    fi
  fi


  # (B) docker compose config (official validation)
  if [ "$USE_COMPOSE_CONFIG_LINT" = "true" ]; then
    info "Compose validate: $c"
    # --quiet: no output if OK, non-zero exit code if invalid
    if ! $DOCKER_COMPOSE_BIN -f "$c" config --quiet; then
      error "[LINT] docker compose config failed: $c"
    fi
  fi
