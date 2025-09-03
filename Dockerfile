# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install necessary build tools and dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    wget \
    dos2unix

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with fallback options
RUN npm cache clean --force && \
    (npm ci --no-audit --no-fund --prefer-offline || \
     npm install --no-audit --no-fund --legacy-peer-deps)

# Copy source code
COPY . ./

# Fix line endings for shell scripts (important for Windows development)
RUN dos2unix ./entrypoint.sh ./entrypoint-processor.sh 2>/dev/null || true

# Generate Prisma client
RUN npx prisma generate

# Debug: check if src/lib/db.ts exists
RUN ls -l src/lib/db.ts || (echo 'src/lib/db.ts not found!' && exit 1)

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Make entrypoint scripts executable
RUN chmod +x ./entrypoint.sh
RUN chmod +x ./entrypoint-processor.sh

# Set environment variables
ENV NODE_ENV=production
# Migration handling environment variables
ENV MIGRATION_FAILURE_ACTION=continue
ENV SKIP_FAILED_MIGRATIONS=true
ENV DB_PUSH_FALLBACK=true

EXPOSE 8021

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8021/api/health || exit 1

# Start the application using the entrypoint script
CMD ["/bin/sh", "/app/entrypoint.sh"]