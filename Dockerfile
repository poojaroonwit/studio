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
ENV NODE_OPTIONS="--max-old-space-size=8192"
# Signal Next.js code that we're in production build phase
ENV NEXT_PHASE=phase-production-build
# Build the application (ESLint and TypeScript errors are ignored during build)
RUN echo "Starting Next.js build..." && \
    npm run build || \
    (echo "Build failed! Checking for common issues..." && \
     echo "Node version:" && node --version && \
     echo "NPM version:" && npm --version && \
     echo "Available memory:" && free -h 2>/dev/null || echo "Memory info not available" && \
     exit 1)

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



# Start the application using the entrypoint script
CMD ["/bin/sh", "/app/entrypoint.sh"]