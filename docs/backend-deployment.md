# Backend Deployment

This runbook covers the backend API and its own infrastructure only —
Postgres, Redis, RabbitMQ, and observability (Prometheus/Grafana). Frontend
apps (merchant dashboard, POS, storefront) are separate repositories with
their own deployment process; this backend has no `client/` directory and
does not orchestrate them.

## Scope

```txt
PostgreSQL
Redis
RabbitMQ (POS outbox event broker)
NestJS API
Prisma migrations
Swagger/API docs
```

Prometheus + Grafana (observability) are optional add-ons, not part of the
core backend — see [Observability (optional)](#observability-optional)
below.

## Local Backend Setup (API on the host)

Start only local infrastructure — Postgres, Redis, RabbitMQ — for the API
to run against from the host via `pnpm start:dev`:

```bash
docker compose -f deployments/docker-compose/docker-compose.dev.yml up -d
```

Install dependencies and prepare the database:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Run the API:

```bash
pnpm start:dev
```

The local API should listen on:

```txt
http://localhost:9001
```

## Full Stack (API + Infrastructure, Containerized)

`deployments/docker-compose/docker-compose.prod.yml` is the canonical compose
file for both a local full-stack run and the production server deployed by
`.github/workflows/deploy.yml`. It builds/runs the API itself, not just its
infrastructure:

```bash
cp deployments/docker-compose/.env.example deployments/docker-compose/.env
# edit deployments/docker-compose/.env — see "Backend Environment" below;
# every value in .env.example is a local-dev placeholder

docker compose -f deployments/docker-compose/docker-compose.prod.yml \
  --env-file deployments/docker-compose/.env up -d --build
```

Services started: `postgres`, `redis`, `rabbitmq`, `app`. `app` waits on
`postgres`/`redis`/`rabbitmq` passing their healthchecks before starting, and
runs `prisma migrate deploy` on boot. Prometheus/Grafana are **not** started
by this command — they sit behind the `observability` Compose profile; see
[Observability (optional)](#observability-optional).

Rebuild and redeploy just the API after a code change:

```bash
docker compose -f deployments/docker-compose/docker-compose.prod.yml build app
docker compose -f deployments/docker-compose/docker-compose.prod.yml up -d --no-build app
```

## Production Deploy (CI/CD)

`.github/workflows/deploy.yml` runs on push to `main`/`master`:

1. **Validate** — lint, type-check, test.
2. **Build & push** — builds the `production` Docker target and pushes
   `ecomm/ecomm-web-server:latest` (and `:<sha>`) to Docker Hub.
3. **Deploy** — SSHes into the production server and runs, from
   `deployments/docker-compose/` (the path in `$DEPLOY_PATH`):
   ```bash
   docker compose pull app
   docker compose up -d --no-build
   ```
   This pulls the freshly pushed image and recreates only what changed;
   Postgres/Redis/RabbitMQ data volumes are untouched.

## Backend Environment

Set these in `deployments/docker-compose/.env` (copied from
`.env.example`) before running anywhere production-facing — every value
in the example file is a local-dev placeholder:

```env
NODE_ENV=production
PORT=3000

DB_USER=
DB_PASSWORD=
DB_NAME=

RABBITMQ_USER=
RABBITMQ_PASSWORD=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30

DASHBOARD_FRONTEND_URL=http://localhost/merchant
PUBLIC_STOREFRONT_URL=http://localhost
```

`DATABASE_URL`, `REDIS_HOST`/`REDIS_PORT`, and `RABBITMQ_URL` are computed by
`docker-compose.prod.yml` itself from the values above for the container network
(e.g. `RABBITMQ_URL=amqp://<user>:<password>@rabbitmq:5672`) — do not set
those three directly in `.env`; see the comments in `.env.example`. The rest
of the app's configuration surface (payment provider, storage provider,
social login, Swagger toggles) is documented in full in
`deployments/docker-compose/.env.example`.

## Verify

```bash
docker compose -f deployments/docker-compose/docker-compose.prod.yml ps
curl -I http://localhost:3000
curl -I http://localhost:3000/docs/user
curl -I http://localhost:3000/docs/merchant
curl -I http://localhost:3000/docs/pos
curl -I http://localhost:3000/docs/storefront
curl -I http://localhost:3000/metrics
```

`/metrics` is exposed by the API itself (for a Prometheus instance to scrape,
in-repo or otherwise) regardless of whether the optional `observability`
profile below is running.

RabbitMQ connectivity (the API logs `RabbitMQ connected at amqp://...` on
boot if this fails, check `RABBITMQ_USER`/`RABBITMQ_PASSWORD` match what the
`rabbitmq` service was actually initialized with — see the note in
`.env.example` about needing to recreate the `rabbitmq` volume if you
change its credentials after first boot):

```bash
docker compose -f deployments/docker-compose/docker-compose.prod.yml logs app | grep RabbitMQ
```

## Observability (optional)

Prometheus and Grafana are bundled in the same compose file but sit behind
the `observability` profile, so the default commands above never start
them. Opt in explicitly:

```bash
docker compose -f deployments/docker-compose/docker-compose.prod.yml \
  --env-file deployments/docker-compose/.env --profile observability up -d --build
```

This adds `prometheus` (port `9090`, scrapes the API's `/metrics`) and
`grafana` (port `3001`, provisioned dashboards under
`deployments/observability/grafana/`). Neither is required for the backend
to run or for `.github/workflows/deploy.yml`'s production deploy, which only
runs `pull`/`up --no-build` against the default (non-observability) profile.

## Backend Ownership Rules

- Backend deploys must not require rebuilding frontend apps.
- Prisma migrations run with the API release (`prisma migrate deploy` runs
  automatically on container start).
- API response format stays backend-owned.
- CORS, auth cookies, and public frontend URLs must be configured per
  environment (`DASHBOARD_FRONTEND_URL`, `PUBLIC_STOREFRONT_URL`).
