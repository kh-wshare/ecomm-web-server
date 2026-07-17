ARG NODE_VERSION=26.5.0

# Stage 1: build
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.30.1

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run prisma:generate
RUN pnpm run build

# Stage 2: production
FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app

RUN npm install -g pnpm@10.30.1

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "pnpm run prisma:migrate:prod && node dist/main"]
