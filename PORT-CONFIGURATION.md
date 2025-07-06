# Studio-5 Port Configuration

This document outlines all port configurations for the Studio-5 application containers.

## Main Application (docker-compose.yml)

### Container Port Mappings

| Service | Internal Port | External Port | Environment Variable | Description |
|---------|---------------|---------------|---------------------|-------------|
| **app** | 9846 | 8021 | `APP_PORT` | Main application (Next.js) |
| **postgres** | 5432 | 8521 | `POSTGRES_PORT` | PostgreSQL database |
| **minio** | 9000 | 8621 | `MINIO_API_PORT` | MinIO API server |
| **minio** | 9001 | 8721 | `MINIO_CONSOLE_PORT` | MinIO web console |
| **redis** | 6379 | 8921 | `REDIS_EXTERNAL_PORT` | Redis cache |
| **upload-queue-processor** | 8080 | 8821 | `PROCESSOR_PORT` | Upload queue processor |

### Default Port Configuration

```yaml
# docker-compose.yml
services:
  app:
    ports:
      - "${APP_PORT:-8021}:9846"
  
  postgres:
    ports:
      - "${POSTGRES_PORT:-8521}:5432"
  
  minio:
    ports:
      - "${MINIO_API_PORT:-8621}:9000"      # API
      - "${MINIO_CONSOLE_PORT:-8721}:9001"  # Console
  
  redis:
    ports:
      - "${REDIS_EXTERNAL_PORT:-8921}:6379"
  
  upload-queue-processor:
    ports:
      - "${PROCESSOR_PORT:-8821}:8080"
```

## 8021 Application (docker-compose.8021.yml)

### Container Port Mappings

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| **8021_hr_ai_screening** | 8021 | 8021 | Main application (Next.js) |
| **postgres** | 5432 | 8521 | PostgreSQL database |
| **minio** | 9000 | 8621 | MinIO API server |
| **minio** | 9001 | 8721 | MinIO web console |
| **redis** | 6379 | 8921 | Redis cache |
| **upload-queue-processor** | 8821 | 8821 | Upload queue processor |

### Fixed Port Configuration

```yaml
# docker-compose.8021.yml
services:
  8021_hr_ai_screening:
    ports:
      - "8021:8021"
  
  postgres:
    ports:
      - "8521:5432"
  
  minio:
    ports:
      - "8621:9000"      # API
      - "8721:9001"      # Console
  
  redis:
    ports:
      - "8921:6379"
  
  upload-queue-processor:
    ports:
      - "8821:8821"
```

## Dockerfile Port Exposures

### Main Application (Dockerfile)
```dockerfile
EXPOSE 9846
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9846/api/health || exit 1
```

### 8021 Application (Dockerfile.8021)
```dockerfile
EXPOSE 8021
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8021/api/health || exit 1
```

### Processor (Dockerfile.processor)
```dockerfile
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ps aux | grep "process-upload-queue.mjs" | grep -v grep || exit 1
```

### 8021 Processor (Dockerfile.processor.8021)
```dockerfile
EXPOSE 8821
```

## Environment Variables

### Main Application
```bash
# Port Configuration
APP_PORT=8021                   # Main application port
POSTGRES_PORT=8521              # PostgreSQL port
MINIO_API_PORT=8621             # MinIO API port
MINIO_CONSOLE_PORT=8721         # MinIO console port
REDIS_EXTERNAL_PORT=8921        # Redis port
PROCESSOR_PORT=8821             # Processor port
```

### 8021 Application
```bash
# Port Configuration (fixed)
APP_PORT=8021                   # Main application port
POSTGRES_PORT=8521              # PostgreSQL port
MINIO_API_PORT=8621             # MinIO API port
MINIO_CONSOLE_PORT=8721         # MinIO console port
REDIS_EXTERNAL_PORT=8921        # Redis port
PROCESSOR_PORT=8821             # Processor port
```

## Access URLs

### Main Application
- **Application**: http://localhost:8021
- **PostgreSQL**: localhost:8521
- **MinIO API**: http://localhost:8621
- **MinIO Console**: http://localhost:8721
- **Redis**: localhost:8921
- **Processor Health**: http://localhost:8821

### 8021 Application
- **Application**: http://localhost:8021
- **PostgreSQL**: localhost:8521
- **MinIO API**: http://localhost:8621
- **MinIO Console**: http://localhost:8721
- **Redis**: localhost:8921
- **Processor Health**: http://localhost:8821

## Health Check Endpoints

### Application Health Checks
```bash
# Main application
curl -f http://localhost:8021/api/health

# 8021 application
curl -f http://localhost:8021/api/health

# Processor (process check)
docker exec <processor-container> ps aux | grep "process-upload-queue.mjs"
```

### Database Health Checks
```bash
# PostgreSQL
docker exec <postgres-container> pg_isready -U postgres

# Redis
docker exec <redis-container> redis-cli ping
```

### MinIO Health Checks
```bash
# MinIO API
curl -f http://localhost:8621/minio/health/live

# MinIO Console
curl -f http://localhost:8721/
```

## Network Configuration

### Main Application Network
- **Network Mode**: Default bridge network
- **Service Discovery**: Container names (app, postgres, minio, redis)

### 8021 Application Network
- **Network Mode**: Custom bridge network (`docker_internal`)
- **Subnet**: 172.20.21.0/24
- **External Network**: `docker_external`

## Security Considerations

1. **Port Exposure**: All ports are exposed for external access
2. **Firewall**: Configure firewalls to restrict access to necessary ports only
3. **SSL/TLS**: Use reverse proxy (nginx/traefik) for HTTPS termination
4. **Authentication**: Implement proper authentication for all services
5. **Network Isolation**: Use separate networks for different environments

## Troubleshooting

### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :8021

# Stop conflicting services
sudo systemctl stop conflicting-service

# Change ports in environment variables
export APP_PORT=8022
```

### Container Connectivity
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app

# Test internal connectivity
docker-compose exec app ping postgres
```

### Health Check Failures
```bash
# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect <container-name> | grep -A 10 Health

# Manual health check
curl -f http://localhost:8021/api/health
```

## Deployment Notes

1. **Environment Variables**: Set appropriate port variables for each environment
2. **Load Balancer**: Configure load balancer to route traffic to correct ports
3. **Monitoring**: Set up monitoring for all exposed ports
4. **Backup**: Ensure database and MinIO data are properly backed up
5. **Scaling**: Consider horizontal scaling for high-traffic deployments 