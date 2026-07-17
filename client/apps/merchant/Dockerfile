ARG NODE_VERSION=24.14.0

FROM node:${NODE_VERSION}-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN npm install -g pnpm@10.30.1

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/merchant/package.json apps/merchant/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY packages/query-client/package.json packages/query-client/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @repo/merchant build

FROM node:${NODE_VERSION}-alpine AS runner
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/apps/merchant/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/merchant/.next/static ./apps/merchant/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/merchant/server.js"]
