
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="docker"

error() { echo "ERROR: $*" >&2; exit 1; }
warn()  { echo "WARN:  $*" >&2; }
info()  { echo "INFO:  $*"; }

DOCKERFILES=$(find "$ROOT_DIR" -type f -name Dockerfile)
COMPOSE_FILES=$(find "$ROOT_DIR" -type f \( \
  -name "docker-compose.yml" -o -name "docker-compose.yaml" -o \
  -name "compose.yml" -o -name "compose.yaml" \
\))

[ -z "${DOCKERFILES:-}" ] && warn "Dockerfile not found under $ROOT_DIR"
[ -z "${COMPOSE_FILES:-}" ] && warn "compose file not found under $ROOT_DIR"

# ---------------------------------------------------------
# Enabled checks (aligned with items 1–10)
# 1) base image minimization
# 2) non-root user
# 5) no secrets in image / compose
# 6) no :latest tag
# 7) avoid ADD, use COPY
# 8) OCI metadata label
# 9) multi-stage build (optional)
# 10) linter is handled separately (hadolint)
#
# Item 3 (image signing / MITM mitigation) is intentionally skipped
# ---------------------------------------------------------

REQUIRE_MINIMAL_BASE_IMAGE=true
REQUIRE_NONROOT_USER=true
REQUIRE_OCI_LABEL=true
REQUIRE_MULTISTAGE=false
ALLOWED_BASE_PATTERNS='(alpine|slim|distroless|ubi-micro|scratch)'
FORBIDDEN_BASE_PATTERNS='(ubuntu|debian|centos|rockylinux|amazonlinux)(:|$)'
FORBID_LATEST_TAG=true
FORBID_ADD=true

SECRET_PATTERNS='(AKIA[0-9A-Z]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|-----BEGIN|password\s*[:=]|passwd\s*[:=]|secret\s*[:=]|api[_-]?key\s*[:=])'

# -----------------------------
# Dockerfile checks
# -----------------------------
for f in $DOCKERFILES; do
  info "Checking Dockerfile: $f"

  # 1) base image minimization
  if $REQUIRE_MINIMAL_BASE_IMAGE; then
    if grep -nE '^\s*FROM\s+' "$f" | grep -E "$FORBIDDEN_BASE_PATTERNS" >/dev/null; then
      error "[1] base image is not minimal (forbidden distro detected) ($f)"
    fi

    if ! grep -nE '^\s*FROM\s+.*'"$ALLOWED_BASE_PATTERNS" "$f" >/dev/null; then
      warn "[1] base image may not be minimal (not in allowed patterns) ($f)"
    fi
  fi

  # 6) forbid :latest
  if $FORBID_LATEST_TAG && grep -nE '^\s*FROM\s+.+:latest(\s|$)' "$f" >/dev/null; then
    error "[6] latest tag is forbidden in FROM ($f)"
  fi

  # 7) forbid ADD
  if $FORBID_ADD && grep -nE '^\s*ADD\s+' "$f" >/dev/null; then
    error "[7] ADD instruction is forbidden, use COPY instead ($f)"
  fi

  # 2) non-root execution required
  if $REQUIRE_NONROOT_USER; then
    if ! grep -nE '^\s*USER\s+' "$f" >/dev/null; then
      error "[2] USER directive is required (non-root) ($f)"
    fi
    if grep -nE '^\s*USER\s+root(\s|$)' "$f" >/dev/null; then
      error "[2] USER root is not allowed ($f)"
    fi
  fi

  # 8) OCI metadata label
  if $REQUIRE_OCI_LABEL; then
    if ! grep -nE '^\s*LABEL\s+org\.opencontainers\.image\.title=' "$f" >/dev/null; then
      error "[8] OCI label org.opencontainers.image.title is required ($f)"
    fi
  fi

  # 9) multi-stage build (optional)
  if $REQUIRE_MULTISTAGE; then
    from_count=$(grep -cE '^\s*FROM\s+' "$f" || true)
    if [ "$from_count" -lt 2 ]; then
      error "[9] multi-stage build is required ($f)"
    fi
  fi

  # 5) secret leakage (heuristic)
  if grep -nE "$SECRET_PATTERNS" "$f" >/dev/null; then
    error "[5] possible secret detected in Dockerfile ($f)"
  fi
done

# -----------------------------
# docker-compose checks
# -----------------------------
for c in $COMPOSE_FILES; do
  info "Checking compose file: $c"

  # 6) forbid :latest
  if $FORBID_LATEST_TAG && grep -nE '^\s*image:\s*.+:latest(\s|$)' "$c" >/dev/null; then
    error "[6] latest tag is forbidden in compose image ($c)"
  fi

  # 5) secret leakage (heuristic)
  if grep -nE "$SECRET_PATTERNS" "$c" >/dev/null; then
    error "[5] possible secret detected in compose file ($c)"
  fi
done

echo "INFO: docker policy checks passed"
