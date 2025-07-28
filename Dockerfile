# FROM 24ep/studio:uatmake sure login page can be setting
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Debug: check if src/lib/db.ts exists
RUN ls -l src/lib/db.ts || (echo 'src/lib/db.ts not found!' && exit 1)

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Make entrypoint scripts executable
RUN chmod +x ./entrypoint.sh
RUN chmod +x ./entrypoint-processor.sh

EXPOSE 8021

CMD ["./entrypoint.sh"]