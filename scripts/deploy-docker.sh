#!/usr/bin/env bash
# Build and start production container with .env.production
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

ENV_FILE=".env.production"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: Missing ${ENV_FILE}"
  echo "  cp .env.production.example .env.production  # see DEPLOYMENT_GUIDE.md"
  echo "  Edit DATABASE_URL with your remote MySQL host, then run again."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" && -z "${DB_HOST:-}" ]]; then
  echo "ERROR: Set DATABASE_URL or DB_HOST in ${ENV_FILE}"
  exit 1
fi

echo "==> Building Docker image..."
docker compose -f docker-compose.production.yml --env-file "${ENV_FILE}" build

echo "==> Starting container..."
docker compose -f docker-compose.production.yml --env-file "${ENV_FILE}" up -d

echo "==> Waiting for app to start..."
sleep 8

BASE="${BASE_URL:-http://localhost:3000}"
if [[ -x scripts/verify-deployment.sh ]]; then
  scripts/verify-deployment.sh "${BASE}"
else
  echo "Run: ./scripts/verify-deployment.sh ${BASE}"
fi

echo ""
echo "Deploy complete. Container:"
docker compose -f docker-compose.production.yml ps
