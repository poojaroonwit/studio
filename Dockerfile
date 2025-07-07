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

# Build the processor scripts
RUN npm run build:processor

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

EXPOSE 8021

CMD ["./entrypoint.sh"]