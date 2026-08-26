#!/bin/sh
# Backend entrypoint: generates cryptographically random secrets on first
# boot and persists them in /run/secrets-generated so restarts reuse the
# same values. Operators may instead provide any of these explicitly via
# environment (explicit values always win).
set -e

SECRETS_DIR=/app/.secrets
# The volume may be root-owned; fall back to a writable dir if mkdir/chmod
# fails as the non-root user.
if ! mkdir -p "$SECRETS_DIR" 2>/dev/null || [ ! -w "$SECRETS_DIR" ]; then
  SECRETS_DIR=/tmp/ferio-secrets
  mkdir -p "$SECRETS_DIR"
fi

gen_once() {
  # gen_once ENV_NAME  -> exports variable if not already set
  name="$1"
  eval "current=\${$name:-}"
  if [ -n "$current" ]; then return 0; fi

  file="$SECRETS_DIR/$name"
  if [ -s "$file" ]; then
    value=$(cat "$file")
  else
    value=$(openssl rand -hex 48)
    echo "$value" > "$file"
    chmod 600 "$file"
  fi
  export "$name=$value"
}

gen_once JWT_ACCESS_SECRET
[ -n "${JWT_REFRESH_SECRET:-}" ] || gen_once JWT_REFRESH_SECRET
gen_once PLATFORM_JWT_SECRET
gen_once PLATFORM_DB_CREDENTIAL_KEY
gen_once PLATFORM_CALLBACK_SECRET

exec "$@"
