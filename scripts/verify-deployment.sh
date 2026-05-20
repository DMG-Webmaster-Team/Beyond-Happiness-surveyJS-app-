#!/usr/bin/env bash
# Post-deploy checks: env (optional) + HTTP health + login response shape
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"

echo "==> Verifying deployment at ${BASE_URL}"
echo ""

if [[ -f .env.production ]]; then
  echo "==> Checking .env.production"
  # shellcheck disable=SC1091
  set -a
  source .env.production
  set +a
  if [[ -z "${DATABASE_URL:-}" && -z "${DB_HOST:-}" ]]; then
    echo "FAIL: Set DATABASE_URL or DB_HOST in .env.production"
    exit 1
  fi
  if [[ "${NODE_ENV:-}" == "production" && "${DATABASE_URL:-}" == *"localhost"* && "${ALLOW_LOCALHOST_DB:-}" != "true" ]]; then
    echo "WARN: DATABASE_URL uses localhost — use remote MySQL host in production"
  fi
  echo "OK: Database env present"
  echo ""
fi

echo "==> GET ${BASE_URL}/api/health"
HEALTH_BODY=$(curl -sf --max-time 20 "${BASE_URL}/api/health" || true)
if [[ -z "${HEALTH_BODY}" ]]; then
  echo "FAIL: Health endpoint unreachable or timed out"
  exit 1
fi
echo "${HEALTH_BODY}" | head -c 500
echo ""
if echo "${HEALTH_BODY}" | grep -q '"status":"healthy"'; then
  echo "OK: Database health check passed"
else
  echo "FAIL: Health check did not report healthy"
  exit 1
fi
echo ""

echo "==> POST ${BASE_URL}/api/auth/login (expect 401, not 5xx)"
LOGIN_CODE=$(curl -s -o /tmp/login-response.json -w "%{http_code}" --max-time 20 \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@surveyjs.com","password":"wrong-password-test"}')

echo "HTTP ${LOGIN_CODE}"
cat /tmp/login-response.json
echo ""

case "${LOGIN_CODE}" in
  401)
    echo "OK: Login returns 401 for bad password (database reachable)"
    ;;
  503)
    echo "FAIL: Database still unavailable (503)"
    exit 1
    ;;
  500)
    echo "FAIL: Server error (500) — check server logs and DATABASE_URL"
    exit 1
    ;;
  *)
    echo "WARN: Unexpected status ${LOGIN_CODE}"
    ;;
esac

echo ""
echo "==> Deployment verification finished successfully"
