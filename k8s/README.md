# Kubernetes Deployment for FitScan

This directory contains Kubernetes manifests for deploying the FitScan application.

## Namespace

All resources are deployed to the `ba-fitscan` namespace.

## Common Labels

All resources use the following labels:
- `app.kubernetes.io/name: fitscan`
- `app.kubernetes.io/version: "0.2.0"`
- `app.kubernetes.io/component: application`
- `app.kubernetes.io/part-of: fitscan-stack`

## Deployment Files

### Core Resources (Apply in order)

1. **01-namespace.yaml** - Creates the `ba-fitscan` namespace
2. **02-configmap.yaml** - Application configuration (database, MinIO, processor settings)
3. **03-secrets.yaml** - Sensitive data (database credentials, API keys, MinIO credentials)
4. **04-fitscan-app.yaml** - Main application deployment containing:
   - Deployment (fitscan-app)
   - Service (fitscan-app-service)
   - ServiceAccount (fitscan-app)
   - PodDisruptionBudget (fitscan-app-pdb)
   - ResourceQuota (fitscan-resource-quota)
   - LimitRange (fitscan-limit-range)
5. **05-fitscan-processor.yaml** - Processor deployment containing:
   - Deployment (fitscan-processor)
   - ServiceAccount (fitscan-processor)
   - PodDisruptionBudget (fitscan-processor-pdb)
6. **06-ingress.yaml** - Ingress configuration for external access
7. **07-hpa.yaml** - Horizontal Pod Autoscaler for app and processor

## Deployment Instructions

### Prerequisites

1. Ensure you have `kubectl` configured to access your Kubernetes cluster
2. Update the following files with your actual values:
   - **03-secrets.yaml**: Replace all base64 encoded secrets with your actual credentials
   - **02-configmap.yaml**: Update external database and MinIO hostnames
   - **06-ingress.yaml**: Update domain names

### Deploy All Resources

Apply all resources in the correct order:

```bash
kubectl apply -f k8s/01-namespace.yaml
kubectl apply -f k8s/02-configmap.yaml
kubectl apply -f k8s/03-secrets.yaml
kubectl apply -f k8s/04-fitscan-app.yaml
kubectl apply -f k8s/05-fitscan-processor.yaml
kubectl apply -f k8s/06-ingress.yaml
kubectl apply -f k8s/07-hpa.yaml
```

Or apply all at once:

```bash
kubectl apply -f k8s/
```

### Verify Deployment

Check the status of your deployments:

```bash
# Check pods
kubectl get pods -n ba-fitscan

# Check services
kubectl get svc -n ba-fitscan

# Check ingress
kubectl get ingress -n ba-fitscan

# Check HPA
kubectl get hpa -n ba-fitscan
```

## Configuration

### External Services

The application is configured to use external services:
- **Database**: PostgreSQL (configured via `POSTGRES_HOST` in 02-configmap.yaml)
- **MinIO**: Object storage (configured via `MINIO_ENDPOINT` in 02-configmap.yaml)

### Image Configuration

Default image: `fitscan:latest`

To use a different image tag, update the `image` field in:
- `04-fitscan-app.yaml` (line 42)
- `05-fitscan-processor.yaml` (line 36)

## Resource Limits

### ResourceQuota (Namespace Level)
- CPU requests: 8 cores
- CPU limits: 16 cores
- Memory requests: 32Gi
- Memory limits: 64Gi
- Max pods: 20
- Max services: 10

### LimitRange (Container Defaults)
- Default CPU: 1 core
- Default Memory: 2Gi
- Default CPU request: 100m
- Default Memory request: 256Mi
- Max CPU: 4 cores
- Max Memory: 8Gi
- Min CPU: 50m
- Min Memory: 64Mi

## Scaling

The application uses Horizontal Pod Autoscaler (HPA):
- **fitscan-app**: 2-10 replicas (CPU: 70%, Memory: 80%)
- **fitscan-processor**: 1-5 replicas (CPU: 70%, Memory: 80%)

## Troubleshooting

### Check Pod Logs

```bash
# App logs
kubectl logs -f deployment/fitscan-app -n ba-fitscan

# Processor logs
kubectl logs -f deployment/fitscan-processor -n ba-fitscan
```

### Check Resource Usage

```bash
kubectl top pods -n ba-fitscan
kubectl top nodes
```

### Describe Resources

```bash
kubectl describe deployment fitscan-app -n ba-fitscan
kubectl describe deployment fitscan-processor -n ba-fitscan
```

## Cleanup

To remove all resources:

```bash
kubectl delete -f k8s/
```

Or delete the namespace (this will delete all resources):

```bash
kubectl delete namespace ba-fitscan
```

