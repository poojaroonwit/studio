# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

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

# Install dependencies with fallback options and better memory management
RUN npm cache clean --force && \
    npm config set maxsockets 50 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    (npm ci --no-audit --no-fund --prefer-offline --maxsockets 50 || \
     npm install --no-audit --no-fund --legacy-peer-deps --maxsockets 50)

# Copy source code
COPY . .

# Fix line endings for shell scripts (important for Windows development)
RUN dos2unix ./entrypoint.sh ./entrypoint-processor.sh 2>/dev/null || true

# Debug: check if src/lib/db.ts exists
RUN ls -l src/lib/db.ts || (echo 'src/lib/db.ts not found!' && exit 1)

# Generate Prisma client (will be done at runtime after migration)
# RUN npx prisma generate

# Build the application with optimized memory settings
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Make entrypoint scripts executable
RUN chmod +x ./entrypoint.sh
RUN chmod +x ./entrypoint-processor.sh

# Set environment variables
ENV NODE_ENV=production

EXPOSE 8021

# Start the application using the entrypoint script
CMD ["/bin/sh", "/app/entrypoint.sh"]