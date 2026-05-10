FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.33.0

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-core/package.json apps/api-core/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile --filter @aisaas/api-core... --filter @aisaas/database...

FROM deps AS builder
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:7344/placeholder?schema=public
COPY . .
RUN pnpm --filter @aisaas/database db:generate
RUN pnpm --filter @aisaas/database build
RUN pnpm --filter @aisaas/api-core build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-core/package.json apps/api-core/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile --prod --filter @aisaas/api-core... --filter @aisaas/database...

FROM base AS runner
ENV NODE_ENV=production
ENV API_CORE_PORT=7342
ENV LOG_DIR=/app/logs

RUN mkdir -p /app/logs /app/uploads \
  && chown -R node:node /app/logs /app/uploads

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api-core/node_modules ./apps/api-core/node_modules
COPY --from=prod-deps --chown=node:node /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder --chown=node:node /app/apps/api-core/dist ./apps/api-core/dist
COPY --from=builder --chown=node:node /app/apps/api-core/package.json ./apps/api-core/package.json
COPY --from=builder --chown=node:node /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=node:node /app/packages/database/generated ./packages/database/generated
COPY --from=builder --chown=node:node /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=node:node /app/packages/database/src ./packages/database/src
COPY --from=builder --chown=node:node /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder --chown=node:node /app/packages/database/prisma.config.ts ./packages/database/prisma.config.ts
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

USER node
EXPOSE 7342

CMD ["node", "apps/api-core/dist/main.js"]
