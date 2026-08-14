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
docker compose -f docker-compose.dev.yml up -d
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

##  Docker

### Local Development Stack

```bash
docker compose -f docker-compose.dev.yml up -d
```

Includes PostgreSQL and Redis.

### Production Build

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

For production deployment guidance, see [docs/docker-deployment.md](docs/docker-deployment.md).

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
│       ├── auth/             # Authentication & sessions
│       ├── merchants/        # Merchant management
│       ├── users/            # User management
│       ├── products/         # Product catalog
│       ├── inventory/        # Stock management
│       ├── checkout/         # Checkout sessions
│       ├── orders/           # Order management
│       ├── payments/         # Payment processing
│       ├── storefront/       # Public storefront
│       ├── theme/            # Theme builder
│       └── notifications/    # Notifications
├── test/                     # End-to-end tests
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── docs/                     # Documentation & deployment guides
├── docker-compose.dev.yml
├── docker-compose.prod.yml
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

### Docker Build

```bash
# Development image
docker build --target development -t ecomm:dev .

# Production image
docker build --target production -t ecomm:prod .
```

### Environment for Production

- Set secure `JWT_*_SECRET` values
- Configure database on managed service
- Set up Redis cluster or managed service
- Configure storage provider (S3, GCS, etc.)
- Update CORS origins
- Enable HTTPS

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
