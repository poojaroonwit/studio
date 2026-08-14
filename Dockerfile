# Multi-stage Dockerfile for Next.js application
# Keep the production image aligned with the Node/npm versions validated in CI.
FROM node:22-alpine AS base

RUN npm install --global npm@11.6.2 && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    dos2unix \
    libc6-compat

WORKDIR /app

# Stage 2: deterministic dependency installation
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm config set maxsockets 10 && \
    npm ci --no-audit

# Stage 2.5: Production Dependencies (for runtime tools like Prisma CLI)
FROM deps AS prod-deps
RUN npm prune --omit=dev && \
    npx prisma generate --generator client

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/prisma ./prisma
COPY . ./

RUN dos2unix ./entrypoint.sh ./entrypoint-processor.sh ./entrypoint-local.sh 2>/dev/null || true
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
ENV NODE_ENV=production

RUN set -e && \
    NEXT_PHASE=phase-production-build \
    npm run build && \
    echo "=== Build completed successfully ===" && \
    cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

# Stage 4: production runtime
FROM node:22-alpine AS runner

RUN npm install --global npm@11.6.2 && \
    apk add --no-cache postgresql-client openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder /app/entrypoint-processor.sh ./entrypoint-processor.sh
COPY --from=builder /app/entrypoint-local.sh ./entrypoint-local.sh
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/scripts ./src/scripts

# Runtime seed dependencies referenced dynamically by Prisma seed code.
COPY --from=builder /app/src/lib/email-template-catalog.ts ./src/lib/email-template-catalog.ts
COPY --from=builder /app/src/lib/email-template-requirements.ts ./src/lib/email-template-requirements.ts

RUN chmod +x ./entrypoint.sh ./entrypoint-processor.sh ./entrypoint-local.sh && \
    chown -R nextjs:nodejs /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8021
ENV HOSTNAME="0.0.0.0"
ENV SKIP_SEED=true

USER nextjs

EXPOSE 8021

CMD ["/bin/sh", "/app/entrypoint.sh"]
