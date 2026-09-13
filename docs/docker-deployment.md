# Docker Deployment

> **Superseded.** This document originally described an all-in-one Docker
> stack — this backend plus `merchant`/`pos`/`storefront` Next.js containers
> and an `nginx` gateway, all built from a `client/` directory inside this
> repo. That `client/` monorepo directory no longer exists here: the
> merchant dashboard, POS app, and storefront are now separate repositories
> with their own deployment processes, not orchestrated from this repo's
> Docker Compose.
>
> **For this backend's own Docker setup (Postgres/Redis/RabbitMQ/API/
> Prometheus/Grafana), see [docs/backend-deployment.md](backend-deployment.md)
> instead** — that is the accurate, current runbook.
>
> If you're looking for how the merchant/POS/storefront frontends deploy and
> how a gateway routes between them, check those apps' own repositories; this
> backend no longer has visibility into or ownership of that setup.

## What changed and why

- [docs/deployment-separation-todo.md](deployment-separation-todo.md) and
  [docs/monolith-removal.md](monolith-removal.md) documented the plan and
  route-parity checklist for splitting the combined frontend monorepo out of
  this repo. That split has since completed: there is no `client/` directory
  here anymore.
- This backend's actual Docker Compose files are:
  - `deployments/docker-compose/docker-compose.dev.yml` — local infra only
    (Postgres/Redis/RabbitMQ) for running the API on the host via
    `pnpm start:dev`.
  - `deployments/docker-compose/docker-compose.prod.yml` — the full containerized
    stack (adds the API itself, plus Prometheus/Grafana), used both locally
    and by `.github/workflows/deploy.yml` for production.
- Neither compose file builds or runs any frontend app or an `nginx` gateway
  — that responsibility moved with the frontend code to its own
  repositories.
