# Kubernetes Deployment for FitScan

This directory contains Kubernetes manifests for deploying the FitScan application.

## Namespace

All resources are deployed to the `ba-fitscan` namespace.

## Common Labels

All resources use the following labels:
- `app.kubernetes.io/name: fitscan`
- `app.kubernetes.io/version: "1.2.3"`
- `app.kubernetes.io/component: application`
- `app.kubernetes.io/part-of: fitscan-stack`

## Deployment Files

### Core Resources (Apply in order)

1. **00-namespace.yaml** - Creates the `ba-fitscan` namespace
2. **01-configmap.yaml** - Application configuration (database, MinIO settings)
3. **02-secrets.yaml** - Sensitive data (database credentials, API keys, MinIO credentials)
4. **03-fitscan-app.yaml** - Main application deployment containing:
   - Deployment (fitscan-app)
   - Service (fitscan-app-service)
   - ServiceAccount (fitscan-app)
   - PodDisruptionBudget (fitscan-app-pdb)
   - ResourceQuota (fitscan-resource-quota)
   - LimitRange (fitscan-limit-range)
5. **05-ingress.yaml** - Ingress configuration for external access

## Deployment Instructions

### Prerequisites

1. Ensure you have `kubectl` configured to access your Kubernetes cluster
2. Update the following files with your actual values:
   - **02-secrets.yaml**: Replace all base64 encoded secrets with your actual credentials
   - **01-configmap.yaml**: Update external database and MinIO hostnames
   - **05-ingress.yaml**: Update domain names

### Deploy All Resources

Apply all resources in the correct order:

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml
kubectl apply -f k8s/03-fitscan-app.yaml
kubectl apply -f k8s/05-ingress.yaml
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
### Image Configuration

Default image: `nccgit.qsncc.com:5555/ba/fitscan:1.2.3`

To use a different image tag, update the `image` field in:
- `03-fitscan-app.yaml`

## Resource Limits

### ResourceQuota (Namespace Level)
- CPU requests: 8 cores
- CPU limits: 16 cores
- Memory requests: 32Gi
- Memory limits: 64Gi

## Scaling

The application uses Horizontal Pod Autoscaler (HPA) settings within `03-fitscan-app.yaml` (if configured):
- **fitscan-app**: 2-10 replicas

## Troubleshooting

### Check Pod Logs

```bash
# App logs
kubectl logs -f deployment/fitscan-app -n ba-fitscan
```

### Check Resource Usage

```bash
kubectl top pods -n ba-fitscan
kubectl top nodes
```

### Describe Resources

```bash
kubectl describe deployment fitscan-app -n ba-fitscan
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

