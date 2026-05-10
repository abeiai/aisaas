FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN npm install -g pnpm@10.33.0

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @aisaas/web...

FROM deps AS builder
ARG APP_VERSION=0.0.0
ENV APP_VERSION="${APP_VERSION}"
COPY . .
RUN pnpm --filter @aisaas/web build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7341
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 7341

CMD ["node", "apps/web/server.js"]
