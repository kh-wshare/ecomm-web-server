# Deployment Separation TODO

Track the move from a mixed full-stack compose setup to clearly separated backend and frontend deployment flows.

## Goal

Backend and frontend can be installed, configured, built, deployed, verified, and rolled back independently.

## Backend Setup

- [x] Backend has a root `Dockerfile`.
- [x] Backend has infra-only local compose via `docker-compose.dev.yml`.
- [x] Backend can run with PostgreSQL and Redis without frontend apps.
- [x] Backend deployment runbook added in `docs/backend-deployment.md`.
- [ ] Add a dedicated backend production compose file, such as `docker-compose.backend.yml`.
- [ ] Move backend-only environment examples into a backend-focused `.env.example` section or file.
- [ ] Add backend smoke script for health, Swagger, auth login, and protected API checks.
- [ ] Document backend rollback steps.

## Frontend Setup

- [x] Client workspace is separated under `client/`.
- [x] Client docs are stored under `client/docs/`.
- [x] Local frontend gateway compose lives under `client/docker-compose.gateway.yml`.
- [x] Frontend deployment runbook added in `client/docs/deployment.md`.
- [x] Frontend `.gitignore` protects generated and local-only files.
- [ ] Add Dockerfile for `apps/marketing`.
- [ ] Add production frontend compose file under `client/`, such as `docker-compose.frontend.yml`.
- [ ] Add frontend nginx config that includes marketing when the target route is decided.
- [ ] Add frontend smoke script for marketing, merchant, POS, storefront, and gateway routes.
- [ ] Document frontend rollback steps per app.

## Full-Stack Compose Cleanup

- [ ] Decide whether root `docker-compose.yml` remains a full-stack demo only.
- [ ] If root compose remains, label it clearly as all-in-one local/demo deployment.
- [ ] If root compose is split, remove frontend services from root compose and keep them in `client/`.
- [ ] Update `docs/docker-deployment.md` after the split is complete.
- [ ] Update CI/CD so backend and frontend pipelines can run independently.

## Definition Of Done

- [ ] Backend deployment can complete from repo root without `client/`.
- [ ] Frontend deployment can complete from `client/` without rebuilding the API.
- [ ] Backend and frontend environment variables are documented separately.
- [ ] Backend and frontend smoke tests are documented separately.
- [ ] Gateway routing is documented for local and production separately.
