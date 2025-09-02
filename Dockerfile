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
COPY . .

# Fix line endings for shell scripts (important for Windows development)
RUN dos2unix ./entrypoint.sh ./entrypoint-processor.sh 2>/dev/null || true

# Debug: check if src/lib/db.ts exists
RUN ls -l src/lib/db.ts || (echo 'src/lib/db.ts not found!' && exit 1)

# Run migration to convert status to statusId during build
RUN npm run fix:status-rename

# Generate Prisma client during build (using mock DATABASE_URL)
# ENV DATABASE_URL="postgresql://mock:mock@localhost:5432/mock"
RUN npx prisma generate

# Build the application (removed memory limit - let Docker manage memory)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Make entrypoint scripts executable
RUN chmod +x ./entrypoint.sh
RUN chmod +x ./entrypoint-processor.sh

# Set environment variables
ENV NODE_ENV=production

EXPOSE 8021

# Start the application using the entrypoint script
CMD ["/bin/sh", "/app/entrypoint.sh"]