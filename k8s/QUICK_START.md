# Quick Start Guide - GitLab CI/CD for Kubernetes

## Quick Setup (5 minutes)

### 1. Create Kubernetes Service Account

```bash
# Run the setup script
./k8s/setup-gitlab-serviceaccount.sh

# Or manually:
kubectl create serviceaccount gitlab-deployer -n fitscan
kubectl create rolebinding gitlab-deployer-binding \
  --clusterrole=edit \
  --serviceaccount=fitscan:gitlab-deployer \
  --namespace=fitscan
```

### 2. Get Credentials

```bash
# Get token
SECRET_NAME=$(kubectl get serviceaccount gitlab-deployer -n fitscan -o jsonpath='{.secrets[0].name}')
kubectl get secret $SECRET_NAME -n fitscan -o jsonpath='{.data.token}' | base64 -d

# Get CA cert
kubectl get secret $SECRET_NAME -n fitscan -o jsonpath='{.data.ca\.crt}'

# Get server URL
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

### 3. Add GitLab CI/CD Variables

Go to **Settings > CI/CD > Variables** and add:

**For Staging:**
- `K8S_STAGING_SERVER` = Your Kubernetes API server URL
- `K8S_STAGING_CA_CERT` = Base64 CA certificate (from step 2)
- `K8S_STAGING_TOKEN` = Service account token (from step 2)
- `STAGING_URL` = Your staging URL (e.g., `https://staging.fitscan.com`)

**For Production:**
- `K8S_PRODUCTION_SERVER` = Your Kubernetes API server URL
- `K8S_PRODUCTION_CA_CERT` = Base64 CA certificate
- `K8S_PRODUCTION_TOKEN` = Service account token
- `PRODUCTION_URL` = Your production URL (e.g., `https://fitscan.com`)

**Important:** Mark all token variables as "Protected" and "Masked"

### 4. Configure GitLab Runners

Ensure you have runners with these tags:
- `docker` - For building images
- `kubernetes` - For deploying to Kubernetes

### 5. Push and Deploy

```bash
# Push to develop branch for staging
git push origin develop

# In GitLab, go to CI/CD > Pipelines
# Click "Play" on the "deploy:staging" job

# For production, push to main branch
git push origin main

# Click "Play" on the "deploy:production" job
```

## Pipeline Flow

```
Push Code
    ↓
Validate (YAML, Docker, K8s)
    ↓
Test (Lint, TypeCheck)
    ↓
Build Docker Image → Push to Registry
    ↓
Security Scan
    ↓
Deploy Staging (Manual) ← develop/staging branch
    ↓
Deploy Production (Manual) ← main branch
```

## Common Commands

### Check Deployment Status
```bash
kubectl get pods -n fitscan
kubectl get deployments -n fitscan
kubectl get hpa -n fitscan
```

### View Logs
```bash
kubectl logs -f deployment/fitscan-app -n fitscan
kubectl logs -f deployment/fitscan-processor -n fitscan
```

### Rollback
```bash
# Via kubectl
kubectl rollout undo deployment/fitscan-app -n fitscan

# Via GitLab
# Go to CI/CD > Pipelines > Click "Rollback" button
```

### Update Image Manually
```bash
# Update image in deployment
kubectl set image deployment/fitscan-app fitscan-app=registry.gitlab.com/your-group/fitscan:tag -n fitscan
kubectl rollout status deployment/fitscan-app -n fitscan
```

## Troubleshooting

### Build Fails
- Check Docker-in-Docker service is running
- Verify GitLab Container Registry access
- Check Dockerfile syntax

### Deployment Fails
- Verify Kubernetes credentials in CI/CD variables
- Check service account permissions: `kubectl get rolebinding -n fitscan`
- Test connection: `kubectl cluster-info`

### Image Pull Errors
- Verify image exists: `docker pull $IMAGE_NAME:$IMAGE_TAG`
- Check image pull secrets in Kubernetes
- Verify registry authentication

## Next Steps

1. **Set up monitoring**: Configure Prometheus/Grafana
2. **Enable auto-scaling**: HPA is already configured
3. **Set up backups**: Configure backups for PostgreSQL and MinIO
4. **Configure SSL**: Set up cert-manager for TLS certificates
5. **Review security**: Check network policies and RBAC

For detailed documentation, see `k8s/gitlab-ci-setup.md` and `k8s/BEST_PRACTICES.md`

