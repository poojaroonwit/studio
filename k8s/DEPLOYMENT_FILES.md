# Kubernetes Deployment Files

This directory contains all the necessary files to deploy the FitScan application to Kubernetes.

## Files Overview

### Core Kubernetes Manifests

1. **`namespace.yaml`** - Creates the `fitscan` namespace
2. **`configmap.yaml`** - Non-sensitive application configuration
3. **`secrets.yaml`** - Sensitive data (passwords, API keys, tokens)
4. **`persistent-volumes.yaml`** - PVCs for PostgreSQL and MinIO data storage
5. **`postgres.yaml`** - PostgreSQL database deployment and service
6. **`minio.yaml`** - MinIO object storage deployment and service
7. **`app.yaml`** - Main FitScan application deployment and service
8. **`processor.yaml`** - Upload queue processor deployment
9. **`ingress.yaml`** - Ingress configuration for external access
10. **`kustomization.yaml`** - Kustomize configuration for managing all resources

### Deployment Scripts

11. **`deploy.sh`** - Bash deployment script for Linux/macOS
12. **`deploy.ps1`** - PowerShell deployment script for Windows

### Documentation

13. **`README.md`** - Comprehensive deployment guide and documentation
14. **`DEPLOYMENT_FILES.md`** - This file, listing all deployment files

## Quick Deployment

### Using Kustomize (Recommended)

```bash
# Deploy everything at once
kubectl apply -k k8s/

# Check status
kubectl get all -n fitscan
```

### Using Individual Files

```bash
# Deploy in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/persistent-volumes.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/app.yaml
kubectl apply -f k8s/processor.yaml
kubectl apply -f k8s/ingress.yaml
```

### Using Deployment Scripts

#### Linux/macOS
```bash
# Make executable and run
chmod +x k8s/deploy.sh
./k8s/deploy.sh --registry your-registry --tag v1.0.0
```

#### Windows
```powershell
# Run PowerShell script
.\k8s\deploy.ps1 -Registry "your-registry" -Tag "v1.0.0"
```

## Before Deployment

1. **Update Secrets**: Edit `k8s/secrets.yaml` with your actual values
2. **Update Configuration**: Edit `k8s/configmap.yaml` if needed
3. **Update Image References**: Replace `fitscan:latest` with your actual image
4. **Update Domains**: Replace `your-domain.com` in ingress and secrets
5. **Build and Push Image**: Ensure your Docker image is available in a registry

## Architecture

The deployment creates the following components:

- **Namespace**: `fitscan`
- **PostgreSQL**: Database with persistent storage
- **MinIO**: Object storage with persistent storage
- **FitScan App**: Main Next.js application (2 replicas)
- **FitScan Processor**: Background queue processor (1 replica)
- **Services**: Internal cluster communication
- **Ingress**: External access configuration

## Resource Requirements

- **CPU**: ~6 cores total (2 for app, 1 for processor, 2 for postgres, 1 for minio)
- **Memory**: ~20GB total (8GB for app, 4GB for processor, 8GB for postgres, 8GB for minio)
- **Storage**: 70GB total (20GB for postgres, 50GB for minio)

## Security Notes

- All sensitive data is stored in Kubernetes secrets
- Secrets are base64 encoded (decode with `echo <base64> | base64 -d`)
- Consider using external secret management for production
- Enable TLS/SSL for production deployments
- Implement network policies for additional security

## Monitoring and Maintenance

- Use `kubectl logs` to view application logs
- Use `kubectl describe` to debug issues
- Monitor resource usage with `kubectl top`
- Set up proper monitoring and alerting for production
