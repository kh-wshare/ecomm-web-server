# NestJS Server

A production-ready REST API built with [NestJS](https://nestjs.com/), [Prisma](https://www.prisma.io/), PostgreSQL, and Redis. Includes JWT authentication, role-based access control, and Swagger documentation.

## Tech Stack

- **Framework:** NestJS 11
- **ORM:** Prisma 7 (PostgreSQL)
- **Cache / Session:** Redis (ioredis)
- **Auth:** Passport.js — JWT + Local strategy
- **Validation:** class-validator / class-transformer
- **API Docs:** Swagger (@nestjs/swagger)
- **Runtime:** Node.js 20, pnpm

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 |
| pnpm | >= 9 |
| Docker & Docker Compose | any recent version |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd nest-server
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# App
PORT=3000
NODE_ENV=development

# Database (PostgreSQL)
DB_USER=dev_user
DB_PASSWORD=soklay512
DB_NAME=dev_db
DB_PORT=5432
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=change_this_to_a_long_random_secret_in_production
JWT_EXPIRES_IN=1h
```

### 4. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

This spins up:
- `nest_postgres_dev` — PostgreSQL 16 on port `5432`
- `nest_redis_dev` — Redis 7 on port `6379`

### 5. Run database migrations

```bash
pnpm prisma:migrate
```

### 6. (Optional) Seed the database

```bash
pnpm prisma:seed
```

### 7. Generate Prisma client

```bash
pnpm prisma:generate
```

### 8. Start the development server

```bash
pnpm start:dev
```

The server will be available at `http://localhost:3000`.  
Swagger UI: `http://localhost:3000/api`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start in standard mode |
| `pnpm start:dev` | Start with hot-reload (watch mode) |
| `pnpm start:debug` | Start with debugger + hot-reload |
| `pnpm start:prod` | Run compiled production build |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm lint` | Lint and auto-fix with ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:cov` | Run tests with coverage report |
| `pnpm test:e2e` | Run end-to-end tests |

### Prisma commands

| Command | Description |
|---------|-------------|
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm prisma:migrate` | Create and apply a new migration (dev) |
| `pnpm prisma:migrate:prod` | Apply pending migrations (production) |
| `pnpm prisma:studio` | Open Prisma Studio GUI |
| `pnpm prisma:seed` | Seed the database |

---

## Production Deployment (Docker)

Build and run the full stack (app + PostgreSQL + Redis) with Docker Compose:

```bash
# Copy and configure env
cp .env.example .env
# Edit .env with production values — especially JWT_SECRET and DB passwords

docker compose up -d --build
```

The app container automatically runs `prisma migrate deploy` before starting.

Services exposed:
- API: `http://localhost:3000`
- PostgreSQL: port `5432`
- Redis: port `6379`

To stop:

```bash
docker compose down
```

To stop and remove volumes (wipes database data):

```bash
docker compose down -v
```

---

## Database Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)  // USER | ADMIN
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── auth/                 # JWT + Local auth strategies
├── config/               # App configuration module
├── infrastructure/
│   ├── database/         # Prisma service
│   └── radis/            # Redis service
└── modules/
    └── users/            # Users CRUD module
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```
