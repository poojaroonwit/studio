# FitScan Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the FitScan application to a Kubernetes cluster.

## Prerequisites

1. **Kubernetes cluster** (version 1.19 or higher)
2. **kubectl** configured to access your cluster
3. **Docker image** of your FitScan application built and pushed to a registry
4. **NGINX Ingress Controller** (or compatible ingress controller)
5. **Storage class** configured in your cluster

## Quick Start

### 1. Build and Push Docker Image

First, build your Docker image and push it to a container registry:

```bash
# Build the image
docker build -t your-registry/fitscan:latest .

# Push to registry
docker push your-registry/fitscan:latest
```

### 2. Update Image References

Update the image references in the deployment files:

```bash
# Update app.yaml and processor.yaml
sed -i 's|fitscan:latest|your-registry/fitscan:latest|g' k8s/app.yaml
sed -i 's|fitscan:latest|your-registry/fitscan:latest|g' k8s/processor.yaml
```

### 3. Configure Secrets

Update the secrets in `k8s/secrets.yaml` with your actual values:

```bash
# Generate base64 encoded secrets
echo -n "your-postgres-password" | base64
echo -n "your-minio-secret-key" | base64
echo -n "your-nextauth-secret" | base64
# ... etc
```

### 4. Update Configuration

Update the external URLs in `k8s/secrets.yaml`:

- Replace `your-domain.com` with your actual domain
- Update MinIO public URLs
- Configure Azure AD settings if using SSO

### 5. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -k k8s/

# Or apply individually
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

### 6. Verify Deployment

```bash
# Check all resources
kubectl get all -n fitscan

# Check pod status
kubectl get pods -n fitscan

# Check logs
kubectl logs -f deployment/fitscan-app -n fitscan
kubectl logs -f deployment/fitscan-processor -n fitscan
```

## Configuration

### Environment Variables

The application uses the following configuration sources:

1. **ConfigMap** (`k8s/configmap.yaml`) - Non-sensitive configuration
2. **Secrets** (`k8s/secrets.yaml`) - Sensitive data like passwords and API keys

### Storage

- **PostgreSQL**: 20Gi persistent volume for database data
- **MinIO**: 50Gi persistent volume for object storage

### Resource Limits

- **Main App**: 2-8Gi memory, 0.5-2 CPU cores
- **Processor**: 1-4Gi memory, 0.25-1 CPU cores
- **PostgreSQL**: 2-8Gi memory, 0.5-2 CPU cores
- **MinIO**: 2-8Gi memory, 0.5-2 CPU cores

## Networking

### Services

- **fitscan-app-service**: Main application (port 8021)
- **postgres-service**: PostgreSQL database (port 5432)
- **minio-service**: MinIO object storage (ports 9000, 9001)

### Ingress

Two ingress configurations are provided:

1. **Host-based routing** (`fitscan-ingress`): Separate domains for app and MinIO
2. **Path-based routing** (`fitscan-ingress-simple`): Single domain with path prefixes

## Scaling

### Horizontal Pod Autoscaling

To enable HPA for the main application:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fitscan-app-hpa
  namespace: fitscan
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fitscan-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring

### Health Checks

All deployments include:

- **Liveness probes**: Restart containers if they become unhealthy
- **Readiness probes**: Remove from service if not ready

### Logging

Access logs using:

```bash
# Application logs
kubectl logs -f deployment/fitscan-app -n fitscan

# Processor logs
kubectl logs -f deployment/fitscan-processor -n fitscan

# Database logs
kubectl logs -f deployment/postgres -n fitscan

# MinIO logs
kubectl logs -f deployment/minio -n fitscan
```

## Troubleshooting

### Common Issues

1. **Image pull errors**: Ensure your image is accessible from the cluster
2. **Database connection issues**: Check PostgreSQL service and credentials
3. **MinIO connection issues**: Verify MinIO service and bucket configuration
4. **Ingress not working**: Check ingress controller and DNS configuration

### Debug Commands

```bash
# Describe resources for detailed status
kubectl describe pod <pod-name> -n fitscan

# Check events
kubectl get events -n fitscan --sort-by='.lastTimestamp'

# Port forward for local testing
kubectl port-forward service/fitscan-app-service 8021:8021 -n fitscan
```

## Security Considerations

1. **Secrets**: Use proper secret management (e.g., external-secrets-operator)
2. **Network policies**: Implement network policies for pod-to-pod communication
3. **RBAC**: Configure proper role-based access control
4. **TLS**: Enable TLS for production deployments
5. **Image security**: Use image scanning and signed images

## Backup and Recovery

### Database Backup

```bash
# Create database backup
kubectl exec -it deployment/postgres -n fitscan -- pg_dump -U postgres studio_production > backup.sql

# Restore database
kubectl exec -i deployment/postgres -n fitscan -- psql -U postgres studio_production < backup.sql
```

### MinIO Backup

MinIO data is stored in the persistent volume. Backup the PVC or use MinIO's built-in backup features.

## Updates and Maintenance

### Rolling Updates

```bash
# Update image
kubectl set image deployment/fitscan-app fitscan-app=your-registry/fitscan:v1.1.0 -n fitscan

# Check rollout status
kubectl rollout status deployment/fitscan-app -n fitscan

# Rollback if needed
kubectl rollout undo deployment/fitscan-app -n fitscan
```

### Database Migrations

Database migrations are handled automatically by the application's entrypoint script. The application will:

1. Wait for database to be ready
2. Check for pending migrations
3. Apply migrations automatically
4. Seed the database if needed

## Production Recommendations

1. **Use managed databases**: Consider using managed PostgreSQL services
2. **Use managed object storage**: Consider using cloud object storage services
3. **Implement monitoring**: Use Prometheus, Grafana, or similar
4. **Set up alerting**: Configure alerts for critical issues
5. **Regular backups**: Implement automated backup strategies
6. **Security scanning**: Regular security scans of images and dependencies
