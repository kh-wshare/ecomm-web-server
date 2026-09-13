# E-Commerce Web Server

A comprehensive multi-tenant e-commerce platform with merchant management, inventory control, checkout, payments, and real-time features. Built with NestJS backend, React/Next.js frontends, PostgreSQL, Redis, and Docker.

## 🎯 Overview

This is the **backend API** for the e-commerce platform with tenant isolation, authentication, and real-time events. Frontend applications are maintained in separate repositories.

### Key Features

- **Multi-Tenant Architecture** - Isolated merchant environments with role-based access control
- **Authentication & Authorization** - JWT-based with refresh token rotation and merchant switching
- **Product Catalog** - SKU management, variants, visibility, and status tracking
- **Inventory Management** - Stock adjustments, concurrent reservations, expiration handling, and movement history
- **Checkout & Orders** - Session-based checkout with price verification and order lifecycle management
- **Payments** - Payment provider adapters and webhook handling
- **Real-Time Features** - WebSocket support via Socket.IO
- **File Storage** - Local or cloud provider file management
- **Audit Logging** - Comprehensive action tracking per merchant
- **Notifications** - Event deduplication and notification management

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend API** | NestJS 11, TypeScript, Express |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Cache/Events** | Redis |
| **Real-Time** | Socket.IO |
| **Package Manager** | pnpm 10.30.1 |
| **Runtime** | Node.js ≥ 26.5.0 |
| **Deployment** | Docker, Docker Compose |
| **Testing** | Jest, Supertest |

## � Quick Start

### Prerequisites

- Node.js ≥ 26.5.0
- Docker & Docker Compose
- pnpm 10.30.1

### 1. Clone & Install

```bash
git clone <repo-url>
cd ecomm-web-server

# Backend dependencies
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

### 3. Start Infrastructure

```bash
docker compose -f deployments/docker-compose/docker-compose.dev.yml up -d
```

This starts PostgreSQL (port 5448) and Redis (port 6388).

### 4. Initialize Database

```bash
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:seed
```

### 5. Run API

```bash
pnpm start:dev
# API available at http://localhost:9001
```

## ⚙️ Environment Configuration

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9001` | API server port |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6388` | Redis connection |
| `JWT_ACCESS_SECRET` | - | Access token secret |
| `JWT_REFRESH_SECRET` | - | Refresh token secret |
| `STORAGE_PROVIDER` | `local` | File storage backend |
| `SWAGGER_ENABLED` | `true` | Enable API documentation |

Refer to `.env.example` for all available options.

## 📚 API Documentation

Swagger documentation is available at:

| Scope | URL |
|-------|-----|
| **User API** | `http://localhost:9001/docs/user` |
| **Merchant API** | `http://localhost:9001/docs/merchant` |
| **POS API** | `http://localhost:9001/docs/pos` |
| **Storefront API** | `http://localhost:9001/docs/storefront` |
| **Admin API** | `http://localhost:9001/docs/admin` |

Control visibility with `SWAGGER_*_ENABLED` environment variables.

## 📋 Backend Scripts

```bash
# Development
pnpm start:dev          # Run with hot reload
pnpm start:debug        # Debug mode
pnpm test               # Unit tests
pnpm test:watch         # Watch mode
pnpm test:cov           # Coverage report
pnpm test:e2e           # End-to-end tests

# Code Quality
pnpm lint               # Lint and auto-fix
pnpm lint:check         # Check without fixing
pnpm type-check         # TypeScript type check
pnpm format             # Format code

# Build
pnpm build              # Production build
pnpm start:prod         # Run production build

# Database
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate     # Run dev migrations
pnpm prisma:migrate:prod # Run prod migrations
pnpm prisma:reset       # Reset database (dev only)
pnpm prisma:seed        # Seed database
pnpm prisma:studio      # Open Prisma Studio
```

## 🐳 Docker

### Local Infrastructure Only

```bash
docker compose -f deployments/docker-compose/docker-compose.dev.yml up -d
```

Starts PostgreSQL (port 5448), Redis (port 6388), and RabbitMQ (AMQP on 5682,
management UI on 15682) for the API running on the host via `pnpm start:dev`.

### Full Stack (App + Infra + Observability)

`deployments/docker-compose/docker-compose.prod.yml` is the canonical compose
file for both a local full-stack run and the production server deployed by
`.github/workflows/deploy.yml` — it builds and runs the API itself alongside
its infrastructure, not just Postgres/Redis:

```bash
cp deployments/docker-compose/.env.example deployments/docker-compose/.env
# edit deployments/docker-compose/.env — every value in .env.example is a
# local-dev placeholder and must be replaced before this runs anywhere
# production-facing (DB/RabbitMQ passwords, JWT secrets, etc.)

docker compose -f deployments/docker-compose/docker-compose.prod.yml \
  --env-file deployments/docker-compose/.env up -d --build
```

| Service | Purpose | Default host port |
|---------|---------|--------------------|
| `app` | The NestJS API | 3000 |
| `postgres` | Database | 5433 |
| `redis` | Cache / sessions | 6379 |
| `rabbitmq` | POS outbox event broker (AMQP) | 5672 |
| `rabbitmq` | Management UI | 15672 |
| `prometheus` | Metrics scraping (`app`'s `/metrics`) | 9090 |
| `grafana` | Metrics dashboards | 3001 |

Rebuilding after a code change (e.g. after pulling new commits):

```bash
docker compose -f deployments/docker-compose/docker-compose.prod.yml build app
docker compose -f deployments/docker-compose/docker-compose.prod.yml up -d --no-build app
```

For production deployment guidance, see
[docs/backend-deployment.md](docs/backend-deployment.md) and
[docs/docker-deployment.md](docs/docker-deployment.md).

## 📁 Project Structure

```
.
├── src/                      # Backend API
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/               # Shared utilities, filters, interceptors
│   ├── config/               # Configuration modules
│   ├── docs/                 # Swagger documentation
│   ├── infrastructure/       # Database, cache, storage
│   └── modules/              # Feature modules
│       ├── authenticated/    # Login, JWT, sessions
│       ├── authorization/    # Roles/permissions
│       ├── merchant/         # Merchant management + nested
│       │   ├── theme/, social-post/, notification/, file-storage/
│       ├── users/            # Platform user administration
│       ├── catalog/          # Product catalog (+ categories/)
│       ├── inventory/        # Stock management
│       ├── branch/           # Merchant branches
│       ├── checkout/         # Public checkout sessions
│       ├── order/            # Order lifecycle
│       ├── payment/          # Payment providers, KHQR/PayWay adapters
│       ├── pricing/          # Shared cart-pricing logic
│       ├── pos/              # POS backend (devices/shifts/orders/kitchen/
│       │                     # payments/tables/customers/sync/audit/realtime)
│       └── storefront/       # Public storefront + payment/webhook/social-post
├── test/                     # End-to-end tests
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── docs/                     # Documentation & deployment guides
├── deployments/
│   ├── docker-compose/
│   │   ├── docker-compose.dev.yml   # Local infra only, for `pnpm start:dev`
│   │   └── docker-compose.prod.yml  # Full stack: app + postgres/redis/
│   │                                # rabbitmq + prometheus/grafana
│   └── observability/        # Prometheus/Grafana provisioning
├── Dockerfile
├── package.json
└── README.md
```

## 🔐 Authentication & Authorization

### Merchant Onboarding

1. Register via `/auth/register-merchant` - Creates merchant, owner user, and initial session
2. Receive access & refresh tokens
3. Switch between owned merchants via `/auth/switch-merchant`

### Role-Based Access Control (RBAC)

- **Owner** - Full merchant access, can invite users and manage permissions
- **Manager** - Merchant operations, no user management
- **Viewer** - Read-only access
- Custom roles per merchant

### Session Handling

- Access tokens are short-lived (default 15 minutes)
- Refresh tokens rotate on each refresh
- Logout revokes session immediately
- Merchant context via `X-Merchant-ID` header or JWT claim

## 💾 Database Schema

Key entities:

- **User** - Individual accounts
- **Merchant** - Tenant with isolated data
- **MerchantUser** - User-merchant relationship and role assignment
- **Product** - Catalog items with variants
- **InventoryStock** - Stock levels per product/channel
- **CheckoutSession** - Shopping cart state
- **Order** - Confirmed purchase with fulfillment tracking
- **Payment** - Payment records and provider adapters
- **AuditLog** - Action history per merchant
- **Theme** - Storefront customization

See `prisma/schema.prisma` for full schema.

## 📊 Testing

### Unit & Integration Tests

```bash
pnpm test               # Run all tests
pnpm test:watch        # Watch mode
pnpm test:cov          # Coverage report
```

### End-to-End Tests

```bash
pnpm test:e2e           # Run E2E suite
```

Tests cover:
- Authentication flows
- Merchant isolation
- Checkout and order lifecycle
- Inventory management
- Storefront operations

## 🚢 Deployment

### Recommended: the full-stack compose file

```bash
cp deployments/docker-compose/.env.example deployments/docker-compose/.env
# edit deployments/docker-compose/.env with real secrets first

docker compose -f deployments/docker-compose/docker-compose.prod.yml \
  --env-file deployments/docker-compose/.env up -d --build
```

This is the same compose file `.github/workflows/deploy.yml` uses on the
production server (there, it runs `docker compose pull app` +
`docker compose up -d --no-build` against the image already built and
pushed by CI, rather than building locally). See
[docs/backend-deployment.md](docs/backend-deployment.md) for the full
runbook.

### Building just the image

```bash
# Development image
docker build --target development -t ecomm:dev .

# Production image
docker build --target production -t ecomm:prod .
```

Useful for pushing to a registry or testing the build in isolation; on its
own it doesn't start Postgres/Redis/RabbitMQ, so prefer the compose command
above for anything you actually want to run.

### Environment for Production

- Set secure `JWT_*_SECRET`, `DB_PASSWORD`, and `RABBITMQ_PASSWORD` values —
  every value in `deployments/docker-compose/.env.example` is a local-dev
  placeholder
- Configure database on a managed service (or keep the compose-managed
  Postgres for a single-server deployment)
- Set up Redis and RabbitMQ similarly (managed service or compose-managed)
- Configure storage provider (S3, GCS, Cloudinary, etc.)
- Update CORS origins (`DASHBOARD_FRONTEND_URL`, `PUBLIC_STOREFRONT_URL`)
- Enable HTTPS (terminate at a reverse proxy in front of `app`)

See [docs/docker-deployment.md](docs/docker-deployment.md) for detailed guidance.

## 📖 Documentation

Additional docs:
- [Docker Deployment](docs/docker-deployment.md)
- [Backend Deployment](docs/backend-deployment.md)
- [Gateway Routing](docs/gateway-routing.md)
- [Improvement Notes](docs/improvement.md)
- [Merchant Roadmap](docs/merchant_master_roadmap.md)
- [Monolith Removal](docs/monolith-removal.md)

## 🤝 Contributing

1. Create feature branch
2. Run `pnpm lint` and `pnpm type-check`
3. Add tests for new features
4. Submit pull request

## 📄 License

UNLICENSED
