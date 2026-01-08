# (A) hadolint（Dockerfile linter）
HADOLINT_CONFIG="$ROOT_DIR/.hadolint.yaml"  # 設定ファイル

if [ "$USE_HADOLINT" = "true" ]; then
  if [ -f "$HADOLINT_CONFIG" ]; then
    info "Hadolint: $f (config: $HADOLINT_CONFIG)"
    if ! docker run --rm -i \
      -v "$HADOLINT_CONFIG:/hadolint.yaml:ro" \
      "$HADOLINT_IMAGE" hadolint -f tty -c /hadolint.yaml - < "$f"; then
      error "[LINT] hadolint failed: $f"
    fi
  else
    warn "Hadolint config not found: $HADOLINT_CONFIG"
    info "Hadolint: $f"
    if ! docker run --rm -i "$HADOLINT_IMAGE" hadolint -f tty - < "$f"; then
      error "[LINT] hadolint failed: $f"
    fi
  fi
fi
