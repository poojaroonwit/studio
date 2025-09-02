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
    npm ci --no-audit --no-fund --prefer-offline || \
    npm install --no-audit --no-fund --legacy-peer-deps

# Copy source code
COPY . .

# Fix line endings for shell scripts (important for Windows development)
RUN dos2unix ./entrypoint.sh ./entrypoint-processor.sh 2>/dev/null || true

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV CI=true

# Debug: show environment and check Node.js version
RUN echo "Node.js version:" && node --version && \
    echo "npm version:" && npm --version && \
    echo "Current directory:" && pwd && \
    echo "Files in current directory:" && ls -la

# Build the application with retry logic
RUN set -e; \
    echo "Starting build process..." && \
    (npm run build || \
     (echo "First build attempt failed, trying clean build..." && \
      npm run build:clean) || \
     (echo "Clean build failed, trying force build..." && \
      npm run build:force) || \
     (echo "All build attempts failed. Build output:" && \
      ls -la .next/ || echo "No .next directory found" && \
      exit 1))

# Make entrypoint scripts executable
RUN chmod +x ./entrypoint.sh
RUN chmod +x ./entrypoint-processor.sh

# Set environment variables
ENV NODE_ENV=production

EXPOSE 8021

# Start the application using the entrypoint script
CMD ["/bin/sh", "/app/entrypoint.sh"]