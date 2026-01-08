# Multi-stage Dockerfile for Next.js application
# Stage 1: Base image with build tools
FROM node:20-alpine AS base

# Install necessary build tools and dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    dos2unix \
    libc6-compat

WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Copy Prisma schema for client generation
COPY prisma ./prisma

# Install dependencies with parallel connections for speed
RUN if [ -f package-lock.json ]; then \
    sed -i.bak '/@next\/swc-win32/d' package-lock.json 2>/dev/null || true; \
    fi && \
    npm config set maxsockets 10 && \
<<<<<<< HEAD
    npm ci --prefer-offline --no-audit --legacy-peer-deps || \
=======
>>>>>>> ca51ac36
    npm install --no-audit --legacy-peer-deps

# Stage 3: Builder
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . ./

# Fix line endings for shell scripts (important for Windows development)
RUN dos2unix ./entrypoint.sh ./entrypoint-processor.sh 2>/dev/null || true

# Generate Prisma client
RUN npx prisma generate

# Debug: check if src/lib/db.ts exists
RUN ls -l src/lib/db.ts || (echo 'src/lib/db.ts not found!' && exit 1)

# Build the application
# Use minimal global env; do not force a dummy DATABASE_URL during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
ENV NODE_ENV=production

# Build the application
RUN set -e && \
    NEXT_PHASE=phase-production-build \
    npm run build && \
    echo "=== Build completed successfully ==="

# Stage 4: Runner (production)
FROM base AS runner

# Install postgresql-client for database operations
RUN apk add --no-cache postgresql-client && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./package-lock.json*
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder /app/entrypoint-processor.sh ./entrypoint-processor.sh
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
<<<<<<< HEAD
=======
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/jsconfig.json ./jsconfig.json
>>>>>>> ca51ac36

# Make entrypoint scripts executable
RUN chmod +x ./entrypoint.sh && \
    chmod +x ./entrypoint-processor.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Migration handling environment variables
ENV MIGRATION_FAILURE_ACTION=continue
ENV SKIP_FAILED_MIGRATIONS=true
ENV DB_PUSH_FALLBACK=true

# Switch to non-root user
USER nextjs

EXPOSE 8021

# Start the application using the entrypoint script
CMD ["/bin/sh", "/app/entrypoint.sh"]
