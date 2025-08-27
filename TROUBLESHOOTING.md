# Troubleshooting Guide

## Common Issues and Solutions

### 1. JavaScript Heap Out of Memory

**Error**: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`

**Solution**: 
- The application now uses increased memory settings by default
- Use the new startup scripts: `npm run start:local` or `npm run start:local:with-processor`
- These scripts automatically set `--max-old-space-size=4096` for the main app and `--max-old-space-size=2048` for the processor

**Manual Fix**:
```bash
# Start main app with increased memory
node --max-old-space-size=4096 --optimize-for-size ./node_modules/.bin/next start -p 8021

# Start processor with increased memory
node --max-old-space-size=2048 ./scripts/process-upload-queue.cjs
```

### 2. Connection Refused Errors

**Error**: `connect ECONNREFUSED ::1:8021`

**Cause**: The upload queue processor is trying to connect to the main application, but it's not running.

**Solution**:
1. **Start the main application first**:
   ```bash
   npm run start:local
   ```

2. **Wait for the main app to be ready** (check http://localhost:8021/api/health)

3. **Then start the processor** (in a separate terminal):
   ```bash
   npm run processor
   ```

4. **Or start both together**:
   ```bash
   npm run start:local:with-processor
   ```

### 3. Missing Environment Configuration

**Error**: Processor can't connect or missing configuration

**Solution**:
1. **Create `.env.local` file**:
   ```bash
   cp env.local.template .env.local
   ```

2. **Update the configuration** in `.env.local`:
   ```env
   NODE_ENV=development
   APP_PORT=8021
   DATABASE_URL=postgresql://studio_user:local_dev_password@localhost:5432/studio_dev
   NEXTAUTH_SECRET=your-local-development-secret-key-change-this
   NEXTAUTH_URL=http://localhost:8021
   PROCESSOR_URL=http://localhost:8021
   ```

### 4. Database Connection Issues

**Error**: Database connection failures

**Solution**:
1. **Ensure PostgreSQL is running**:
   ```bash
   # Check if PostgreSQL is running
   pg_isready -h localhost -p 5432
   ```

2. **Create the database if it doesn't exist**:
   ```bash
   createdb -h localhost -U studio_user studio_dev
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

### 5. MinIO Connection Issues

**Error**: MinIO connection failures

**Solution**:
1. **Start MinIO using Docker**:
   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     minio/minio server /data --console-address ":9001"
   ```

2. **Or use the full Docker Compose setup**:
   ```bash
   docker-compose up -d
   ```

## Quick Start Commands

### Option 1: Use the new startup script (Recommended)
```bash
# Start main app only
npm run start:local

# Start both main app and processor
npm run start:local:with-processor
```

### Option 2: Manual startup
```bash
# Terminal 1: Start main app
npm run start

# Terminal 2: Start processor (after main app is ready)
npm run processor
```

### Option 3: Development mode
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start processor
npm run processor
```

## Health Checks

- **Main Application**: http://localhost:8021/api/health
- **Processor Status**: Check the processor logs for status messages
- **Database**: `pg_isready -h localhost -p 5432`
- **MinIO**: http://localhost:9001 (console)

## Memory Optimization

The application now includes several memory optimizations:

1. **Increased heap size** for both main app (4GB) and processor (2GB)
2. **Optimized garbage collection** with `--optimize-for-size`
3. **Improved connection pooling** to prevent database exhaustion
4. **Health checks** to prevent unnecessary processing when app is down

## Logs and Debugging

- **Main app logs**: Check the terminal where you started the main app
- **Processor logs**: Check the terminal where you started the processor
- **Database logs**: Check PostgreSQL logs
- **MinIO logs**: Check Docker logs if using containerized MinIO

## Performance Tips

1. **Use the startup script** - it automatically handles memory settings
2. **Start with processor only when needed** - the processor uses additional resources
3. **Monitor memory usage** - use `htop` or Task Manager to monitor system resources
4. **Restart periodically** - if you notice memory usage growing over time
