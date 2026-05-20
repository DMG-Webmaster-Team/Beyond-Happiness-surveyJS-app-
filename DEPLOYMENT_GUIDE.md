# Production deployment guide

Deploy **Beyond Happiness Survey** (Next.js + MySQL). Code is on `main` and `production`; the server must supply database env vars at runtime.

## Prerequisites

- Docker (recommended) or Node 20+
- MySQL reachable from the app server (not `localhost` inside Docker unless MySQL runs in the same compose stack)
- Git access to `https://github.com/DMG-Webmaster-Team/Beyond-Happiness-surveyJS-app-`

## Step 1 — Clone and checkout

```bash
git clone https://github.com/DMG-Webmaster-Team/Beyond-Happiness-surveyJS-app-.git
cd Beyond-Happiness-surveyJS-app-
git checkout main
git pull origin main
```

## Step 2 — Configure environment on the server

On the production host, create `.env.production` (never commit this file):

```bash
cp .env.production.example .env.production
nano .env.production
```

**Required:**

```bash
NODE_ENV=production
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/happiness_survey
```

Replace `DB_HOST` with the real MySQL hostname or IP (e.g. RDS endpoint, VPS private IP).  
Do **not** use MAMP `socketPath` or `localhost` unless MySQL runs in the same Docker network.

**Optional (instead of `DATABASE_URL`):**

```bash
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=happiness_survey
```

## Step 3 — Open firewall

Allow the app server to reach MySQL on port **3306** (or your custom port).

## Step 4 — Build and run (Docker)

```bash
chmod +x scripts/deploy-docker.sh scripts/verify-deployment.sh
./scripts/deploy-docker.sh
```

Or manually:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

## Step 5 — Verify deployment

```bash
./scripts/verify-deployment.sh https://beyondhappiness-global.com
```

Expected:

- `GET /api/health` → `200` with `"status":"healthy"`
- Login with wrong password → `401` (not `500`/`503`)
- Login with DB down → `503` with a clear database message

## Step 6 — Redeploy after code changes

```bash
git pull origin main
./scripts/deploy-docker.sh
./scripts/verify-deployment.sh https://beyondhappiness-global.com
```

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `connect ETIMEDOUT` | Wrong `DATABASE_URL` host or firewall blocking 3306 |
| `Database misconfigured: production cannot use host "localhost"` | Set remote `DATABASE_URL`; do not use dev/MAMP URL |
| `503` on login | DB unreachable — fix env and restart container |
| `401` on login | DB works; check admin email/password in `admins` table |

## Health check URL

```
https://beyondhappiness-global.com/api/health
```
