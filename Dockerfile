# FROM 24ep/studio:uatmake sure login page can be setting
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Compile process-upload-queue.ts to process-upload-queue.mjs
RUN npx tsc process-upload-queue.ts --module NodeNext --target es2020 --esModuleInterop --moduleResolution nodenext --outDir . && \
    mv process-upload-queue.js process-upload-queue.mjs

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port 9846
EXPOSE 9846

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9846/api/health || exit 1

CMD ["./entrypoint.sh"]