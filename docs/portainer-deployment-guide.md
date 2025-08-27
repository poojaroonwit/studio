# Portainer Deployment Guide

## 🚀 **Deploying Studio-9 on Portainer**

This guide provides best practices for deploying the Studio-9 application on Portainer.

## 📋 **Prerequisites**

- Portainer CE/EE installed and running
- Docker environment configured
- Environment variables prepared

## 🔧 **Deployment Steps**

### **1. Prepare Environment Variables**

Create a `.env` file with all required variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/your_database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=your_database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MinIO Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=studio-production
MINIO_USE_SSL=false
MINIO_PUBLIC_BASE_URL=http://your-domain:9847
NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL=http://your-domain:9847

# Application Configuration
NEXTAUTH_URL=http://your-domain:8021
NEXTAUTH_SECRET=your_nextauth_secret
NODE_ENV=production
APP_PORT=8021

# Processor Configuration
PROCESSOR_API_KEY=your_secure_api_key
PROCESSOR_URL=http://app:8021
UPLOAD_QUEUE_PROCESS_URL=http://app:8021/api/upload-queue/process

# Optional: Azure AD (if using SSO)
AZURE_AD_CLIENT_ID=your_azure_client_id
AZURE_AD_CLIENT_SECRET=your_azure_client_secret
AZURE_AD_TENANT_ID=your_azure_tenant_id
```

### **2. Upload to Portainer**

1. **Access Portainer**: Navigate to your Portainer instance
2. **Create Stack**: Go to Stacks → Add Stack
3. **Upload Files**: 
   - Upload `docker-compose.yml`
   - Upload `.env` file (or paste environment variables)
4. **Set Stack Name**: Use `studio-9` (matches the name in docker-compose.yml)
5. **Deploy**: Click "Deploy the stack"

### **3. Monitor Deployment**

#### **Expected Container Names**
- `studio-9-app-1`
- `studio-9-postgres-1`
- `studio-9-minio-1`
- `studio-9-upload-queue-processor-1`

#### **Health Check Timeline**
1. **PostgreSQL**: ~30 seconds to become healthy
2. **MinIO**: ~30 seconds to become healthy
3. **App**: ~60 seconds to become healthy
4. **Upload Queue Processor**: Starts after app is healthy

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. App Container Crashes**
**Symptoms**: Upload queue processor shows `getaddrinfo ENOTFOUND app`

**Solution**:
```bash
# In Portainer terminal or SSH
docker-compose -p studio-9 restart app
docker-compose -p studio-9 restart upload-queue-processor
```

#### **2. Database Connection Issues**
**Symptoms**: App fails to start with database errors

**Solution**:
```bash
# Check database logs
docker logs studio-9-postgres-1

# Restart database if needed
docker-compose -p studio-9 restart postgres
```

#### **3. MinIO Access Issues**
**Symptoms**: File uploads fail

**Solution**:
```bash
# Check MinIO logs
docker logs studio-9-minio-1

# Verify bucket exists
docker exec studio-9-minio-1 mc ls /data
```

### **Health Check Commands**

```bash
# Check all services
docker-compose -p studio-9 ps

# Check app health
curl http://localhost:8021/api/health

# Check upload queue processor logs
docker logs studio-9-upload-queue-processor-1 --tail 20
```

## 🔄 **Maintenance**

### **Regular Maintenance Tasks**

1. **Monitor Logs**: Check container logs weekly
2. **Backup Database**: Regular PostgreSQL backups
3. **Update Images**: Periodically update base images
4. **Check Disk Space**: Monitor volume usage

### **Update Deployment**

1. **Stop Stack**: Portainer → Stacks → studio-9 → Stop
2. **Update Files**: Upload new docker-compose.yml
3. **Redeploy**: Start the stack again

## 📊 **Monitoring**

### **Key Metrics to Monitor**

- **Container Health**: All containers should show "healthy"
- **Memory Usage**: Monitor 8GB limits
- **Disk Space**: Check volume usage
- **Network Connectivity**: Ensure inter-service communication

### **Log Monitoring**

```bash
# Real-time logs
docker-compose -p studio-9 logs -f

# Specific service logs
docker-compose -p studio-9 logs -f app
docker-compose -p studio-9 logs -f upload-queue-processor
```

## 🛡️ **Security Considerations**

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Use strong, unique API keys
3. **Network Access**: Limit external access to necessary ports only
4. **Regular Updates**: Keep base images updated

## 📞 **Support**

If you encounter issues:

1. Check container logs first
2. Verify environment variables
3. Ensure all services are healthy
4. Check network connectivity between services

---

**Note**: This deployment uses `restart: always` policies to ensure high availability. Services will automatically restart if they crash.
