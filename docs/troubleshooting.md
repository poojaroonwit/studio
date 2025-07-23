# Troubleshooting Guide

## Candidates Page Loading Issues

If you're seeing "Loading Candidates..." for an extended period, this usually indicates that one or more required services are not running properly.

### Quick Fix Steps

1. **Check if all services are running:**
   ```bash
   docker-compose ps
   ```

2. **Start all services:**
   ```bash
   # If you have the start script
   ./backup/start-app.sh
   
   # Or manually
   docker-compose up -d
   ```

3. **Check service logs:**
   ```bash
   # Check all services
   docker-compose logs
   
   # Check specific service
   docker-compose logs app
   docker-compose logs postgres
   docker-compose logs minio
   ```

### Common Issues and Solutions

#### 1. Database Connection Issues

**Symptoms:** Candidates page shows loading indefinitely, console shows database connection errors.

**Solution:**
```bash
# Restart the database service
docker-compose restart postgres

# If that doesn't work, check if the database is properly initialized
docker-compose logs postgres | grep "database system is ready"
```

#### 2. MinIO Storage Issues

**Symptoms:** File uploads fail, candidates page loads but file operations don't work.

**Solution:**
```bash
# Restart MinIO service
docker-compose restart minio

# Check MinIO logs
docker-compose logs minio
```

#### 3. Environment Configuration Issues

**Symptoms:** Authentication fails, API calls return 500 errors.

**Solution:**
1. Ensure `.env.local` file exists and is properly configured
2. Copy from template: `cp env.local.template .env.local`
3. Update the configuration values, especially:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`

#### 4. Port Conflicts

**Symptoms:** Services fail to start, "port already in use" errors.

**Solution:**
```bash
# Check what's using the ports
netstat -tulpn | grep :8021
netstat -tulpn | grep :8521
netstat -tulpn | grep :8621

# Stop conflicting services or change ports in docker-compose.yml
```

### Health Check Component

The application now includes a built-in health check component that appears when the candidates page is loading. This component will:

- Check if the API server is responding
- Verify database connectivity
- Test MinIO storage access
- Provide specific error messages for each service

### Manual Health Check

You can manually test each service:

```bash
# Test API health
curl http://localhost:8021/api/health

# Test database (will return 401 if DB is working but auth failed)
curl http://localhost:8021/api/candidates?limit=1

# Test MinIO through positions API
curl http://localhost:8021/api/positions
```

### Complete Reset

If all else fails, you can perform a complete reset:

```bash
# Stop all services and remove volumes
docker-compose down -v

# Rebuild and start fresh
./backup/start-app.sh --reinit
```

**Warning:** This will delete all data in the database and MinIO storage.

### Development Mode

If you're running in development mode:

```bash
# Start the development server
npm run dev

# Make sure the database is running
docker-compose up postgres minio -d
```

### Getting Help

If you're still experiencing issues:

1. Check the browser console for JavaScript errors
2. Review the application logs: `docker-compose logs app`
3. Verify all environment variables are set correctly
4. Ensure Docker has sufficient resources allocated

### Default Credentials

After a fresh installation, the default admin credentials are:
- **Email:** admin@ncc.com
- **Password:** nccadmin 