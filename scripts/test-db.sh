#!/usr/bin/env bash
# Apply every migration to a fresh Postgres and run the SQL security tests.
#
#   npm run test:db                 # throwaway Docker container (default)
#   ADMIN_DB_URL=... DB_URL=... npm run test:db   # existing empty database
#
# ADMIN_DB_URL must connect as supabase_admin (to stub the auth schema);
# DB_URL as postgres (the role Supabase runs migrations with).
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${SUPABASE_PG_IMAGE:-public.ecr.aws/supabase/postgres:15.8.1.085}"
CONTAINER=""

cleanup() {
  if [[ -n "$CONTAINER" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ -z "${DB_URL:-}" ]]; then
  PORT="${PG_PORT:-55499}"
  CONTAINER="atw-test-db-$$"
  echo "Starting $IMAGE on 127.0.0.1:$PORT ..."
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres \
    -p "127.0.0.1:$PORT:5432" "$IMAGE" >/dev/null
  DB_URL="postgresql://postgres:postgres@127.0.0.1:$PORT/postgres"
  ADMIN_DB_URL="postgresql://supabase_admin:postgres@127.0.0.1:$PORT/postgres"

  # The image restarts once during init; wait until auth.users exists.
  for _ in $(seq 1 90); do
    if psql "$DB_URL" -tAc "select 1 from auth.users limit 0" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

: "${ADMIN_DB_URL:?ADMIN_DB_URL is required when DB_URL is set}"

export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

echo "Stubbing GoTrue auth objects ..."
"${PSQL[@]}" "$ADMIN_DB_URL" -f supabase/tests/auth-stub.sql >/dev/null

for f in supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")"
  "${PSQL[@]}" "$DB_URL" -f "$f" >/dev/null
done

echo "Running supabase/tests/security.sql ..."
if ! out=$("${PSQL[@]}" "$DB_URL" -f supabase/tests/security.sql 2>&1); then
  echo "$out" >&2
  exit 1
fi
echo "$out" | grep "all checks passed"
