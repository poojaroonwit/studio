# Studio-5 CI/CD Pipeline Documentation

This document provides comprehensive information about the GitLab CI/CD pipeline setup for the Studio-5 HR AI Screening Application.

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Stages](#pipeline-stages)
3. [Container Configuration](#container-configuration)
4. [Setup Instructions](#setup-instructions)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Overview

The Studio-5 application uses a comprehensive GitLab CI/CD pipeline that includes:

- **Multi-stage pipeline** with validation, testing, building, security scanning, and deployment
- **Multiple container images** for different components (main app, processor, 8021 variants)
- **Exposed ports** for all containers to enable external access
- **Health checks** for all services
- **Automated testing** and security scanning
- **Manual deployment gates** for production environments

## Pipeline Stages

### 1. Validate Stage
- **validate:yaml**: Validates all YAML configuration files
- **validate:docker**: Builds all Docker images to ensure they work correctly

### 2. Test Stage
- **test:lint**: Runs ESLint for code quality checks
- **test:unit**: Executes unit tests with coverage reporting
- **test:integration**: Runs integration tests with database and Redis services

### 3. Build Stage
- **build:app**: Builds and pushes the main application image
- **build:processor**: Builds and pushes the upload queue processor image
- **build:app-8021**: Builds and pushes the 8021 variant application image
- **build:processor-8021**: Builds and pushes the 8021 variant processor image

### 4. Security Stage
- **security:scan**: Runs Trivy security scanner on built images

### 5. Deploy Stages
- **deploy:staging**: Deploys to staging environment (manual trigger)
- **deploy:production**: Deploys to production environment (manual trigger)
- **deploy:staging-8021**: Deploys 8021 variant to staging (manual trigger)
- **deploy:production-8021**: Deploys 8021 variant to production (manual trigger)

## Container Configuration

### Port Exposures

All containers now expose their ports for external access:

#### Main Application (Port 8021)
```yaml
# Dockerfile
EXPOSE 8021
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8021/api/health || exit 1
```

#### 8021 Application (Port 8021)
```yaml
# Dockerfile.8021
EXPOSE 8021
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8021/api/health || exit 1
```

#### Processor Containers
```yaml
# Dockerfile.processor
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ps aux | grep "process-upload-queue.mjs" | grep -v grep || exit 1

# Dockerfile.processor.8021
EXPOSE 8821
```

### Docker Compose Port Mappings

#### Main Application (docker-compose.yml)
```yaml
services:
  app:
    ports:
      - "${APP_PORT:-8021}:8021"
  
  postgres:
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
  
  minio:
    ports:
      - "${MINIO_API_PORT:-9847}:9000"
      - "${MINIO_CONSOLE_PORT:-9848}:9001"
  
  redis:
    ports:
      - "${REDIS_EXTERNAL_PORT:-9850}:6379"
```

#### 8021 Application (docker-compose.8021.yml)
```yaml
services:
  8021_hr_ai_screening:
    ports:
      - "8021:8021"
  
  postgres:
    ports:
      - "8521:5432"
  
  minio:
    ports:
      - "8621:9000"
      - "8721:9001"
  
  redis:
    ports:
      - "8921:6379"
  
  upload-queue-processor:
    ports:
      - "8821:8821"
```

## Setup Instructions

### 1. GitLab Project Configuration

1. **Enable Container Registry**:
   - Go to your GitLab project
   - Navigate to Settings > General > Visibility
   - Enable "Container registry"

2. **Configure CI/CD Variables**:
   - Go to Settings > CI/CD > Variables
   - Add all required variables from `.gitlab-ci-variables.md`

3. **Set up SSH Keys**:
   ```bash
   # Generate SSH key pair
   ssh-keygen -t rsa -b 4096 -C "gitlab-ci@example.com"
   
   # Add public key to target servers
   ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@staging.example.com
   ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@prod.example.com
   
   # Add private key to GitLab CI/CD variables
   # Copy the content of ~/.ssh/id_rsa to STAGING_SSH_PRIVATE_KEY and PRODUCTION_SSH_PRIVATE_KEY
   ```

### 2. Environment Configuration

1. **Copy environment templates**:
   ```bash
   cp env.staging.template .env.staging
   cp env.production.template .env.production
   ```

2. **Fill in actual values** in the environment files

3. **Set up target servers**:
   ```bash
   # On staging/production servers
   mkdir -p /var/www/studio-5
   cd /var/www/studio-5
   git clone <your-gitlab-repo-url> .
   ```

### 3. Docker Registry Setup

The pipeline uses GitLab's built-in container registry. Images are automatically tagged with:
- `$CI_COMMIT_SHA`: Specific commit hash
- `latest`: Latest version

## Deployment

### Automated Deployment

The pipeline automatically:
1. Builds images on every push to main branch
2. Runs security scans
3. Provides manual deployment buttons for staging and production

### Manual Deployment

Use the deployment script for manual deployments:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (with confirmation)
./scripts/deploy.sh production

# Deploy 8021 variant
./scripts/deploy.sh staging --8021

# Force deployment without confirmation
./scripts/deploy.sh production --force

# Deploy specific version
./scripts/deploy.sh staging -v v1.2.3
```

### Deployment Process

1. **Code Pull**: Latest code is pulled from GitLab
2. **Image Pull**: Latest Docker images are pulled from registry
3. **Service Restart**: Containers are stopped and restarted
4. **Health Check**: Application health is verified
5. **Rollback**: Automatic rollback on failure

## Monitoring

### Health Checks

All containers include health checks:

```bash
# Check container health
docker ps

# View health check logs
docker inspect <container-name> | grep -A 10 Health

# Manual health check
curl -f http://localhost:8021/api/health
```

### Logs

```bash
# View application logs
docker-compose logs -f app

# View processor logs
docker-compose logs -f upload-queue-processor

# View all logs
docker-compose logs -f
```

### Metrics

The application exposes metrics on the health endpoint:
- Application status
- Database connectivity
- Redis connectivity
- MinIO connectivity

## Troubleshooting

### Common Issues

#### 1. Docker Build Failures
```bash
# Check Dockerfile syntax
docker build --no-cache -t test-image .

# Verify all files are present
ls -la

# Check for missing dependencies
npm install
```

#### 2. Deployment Failures
```bash
# Test SSH connection
ssh -i /path/to/key deploy@host

# Check server connectivity
ping host

# Verify target directories
ssh user@host "ls -la /var/www/studio-5"
```

#### 3. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :8021

# Stop conflicting services
sudo systemctl stop conflicting-service
```

#### 4. Environment Variable Issues
```bash
# Verify variables are set
echo $VARIABLE_NAME

# Check variable names match exactly
grep -r "VARIABLE_NAME" .
```

### Debug Commands

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs <service-name>

# Execute commands in container
docker-compose exec <service-name> sh

# Check network connectivity
docker-compose exec app ping postgres

# Verify database connection
docker-compose exec app npx prisma db push
```

### Rollback Procedure

```bash
# Manual rollback
docker-compose down
docker-compose up -d

# Or use deployment script
./scripts/deploy.sh production --force
```

## Security Considerations

1. **SSH Keys**: Store private keys securely in GitLab CI/CD variables
2. **Environment Variables**: Mark sensitive variables as "Protected" and "Masked"
3. **Network Security**: Use firewalls to restrict port access
4. **Container Security**: Run containers as non-root users
5. **Regular Updates**: Keep base images and dependencies updated

## Performance Optimization

1. **Resource Limits**: Containers have memory and CPU limits
2. **Caching**: Use Docker layer caching and npm caching
3. **Health Checks**: Regular health monitoring prevents issues
4. **Logging**: Structured logging for better debugging

## Support

For issues with the CI/CD pipeline:

1. Check the GitLab CI/CD logs
2. Review the troubleshooting section
3. Verify environment variables are correctly set
4. Test deployment manually using the deployment script
5. Check container health and logs

## Contributing

When contributing to the CI/CD pipeline:

1. Test changes locally first
2. Update documentation
3. Follow the existing pipeline structure
4. Add appropriate error handling
5. Include rollback procedures 