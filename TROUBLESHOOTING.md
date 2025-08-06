# Troubleshooting Guide for Studio Application

## Database Connection Issues

### Problem
The application is failing to connect to PostgreSQL with the error:
```
❌ Database connection test failed. Please check your credentials.
Host: postgres
Port: 5432
User: postgres
Password: sec...
```

### Solutions

#### 1. Docker Desktop Issues
If you see errors like:
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Solution:**
1. Restart Docker Desktop completely
2. Wait for Docker Desktop to fully initialize (2-3 minutes)
3. Test with: `docker ps`

#### 2. Database Connection Retry Logic
The entrypoint script has been improved with better retry logic:
- PostgreSQL readiness check: 30 attempts with 3-second intervals
- Database connection test: 10 attempts with 2-second intervals
- MinIO client setup: 5 attempts with 3-second intervals

#### 3. Environment Variables
Ensure your `.env` file has the correct configuration:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:secure_password@postgres:5432/studio_production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=studio_production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MinIO Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioaccesskey
MINIO_ROOT_PASSWORD=miniosecretkey
MINIO_BUCKET_NAME=studio-production
```

#### 4. Network Configuration
The Docker Compose file has been updated to use only the `docker_internal` network to avoid conflicts.

### MinIO Issues

#### Problem
MinIO client setup failures:
```
⚠️  MinIO client setup failed, but continuing...
mc: Please use 'mc anonymous'
```

#### Solution
The entrypoint script has been updated to:
1. Use the correct `mc anonymous` command instead of `mc policy`
2. Implement retry logic for MinIO client setup
3. Continue gracefully if MinIO setup fails

### Testing Steps

#### 1. Test Database Connection
Run the database connection test script:
```bash
./test-db-connection.sh
```

#### 2. Validate Environment
Run the environment validation script:
```bash
./validate-env.sh
```

#### 3. Start Services Step by Step
1. Start Docker Desktop and wait for it to be ready
2. Start PostgreSQL first: `docker-compose up postgres -d`
3. Wait for PostgreSQL to be ready: `docker-compose logs postgres`
4. Start MinIO: `docker-compose up minio -d`
5. Start the application: `docker-compose up app -d`

### Common Issues and Fixes

#### Issue: PostgreSQL container not starting
**Solution:**
```bash
# Check if port 8521 is already in use
netstat -an | findstr :8521

# If in use, change the port in docker-compose.yml
# or stop the conflicting service
```

#### Issue: MinIO bucket not accessible
**Solution:**
```bash
# Check MinIO logs
docker-compose logs minio

# Manually create bucket if needed
docker-compose exec minio mc mb minio/studio-production
```

#### Issue: Application can't connect to database
**Solution:**
1. Ensure PostgreSQL is running: `docker-compose ps postgres`
2. Check PostgreSQL logs: `docker-compose logs postgres`
3. Test connection manually: `docker-compose exec app ./test-db-connection.sh`

### Debugging Commands

```bash
# Check all container status
docker-compose ps

# View logs for specific service
docker-compose logs app
docker-compose logs postgres
docker-compose logs minio

# Test database connection from app container
docker-compose exec app ./test-db-connection.sh

# Validate environment in app container
docker-compose exec app ./validate-env.sh

# Access PostgreSQL directly
docker-compose exec postgres psql -U postgres -d studio_production

# Access MinIO console
# Open http://localhost:8721 in browser
# Login with: minioaccesskey / miniosecretkey
```

### Environment File Template
Make sure your `.env` file includes all required variables. Copy from `env.production.template` and adjust for your environment.

### Permission Issues

#### Problem
The entrypoint script might not be executable or have incorrect line endings:
```
❌ Script is not executable
❌ entrypoint.sh has Windows line endings (CRLF)
```

#### Solution
1. **Fix line endings**: The Dockerfile now includes `dos2unix` to convert Windows line endings
2. **Check permissions**: The script now self-checks and fixes its own permissions
3. **Test the build**: Run `./test-docker-build.sh` to verify the Docker build process

#### Testing Commands
```bash
# Test the Docker build process
./test-docker-build.sh

# Test the entrypoint script locally
./test-entrypoint.sh

# Check script permissions
ls -la entrypoint.sh
```

### Next Steps
1. Restart Docker Desktop completely
2. Wait for Docker to be fully ready
3. Run the validation scripts: `./test-docker-build.sh`
4. Start services one by one
5. Monitor logs for any remaining issues 