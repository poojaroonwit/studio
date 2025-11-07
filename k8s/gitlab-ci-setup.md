# GitLab CI/CD Setup for Kubernetes Deployment

This guide explains how to set up GitLab CI/CD for deploying FitScan to Kubernetes.

## Prerequisites

1. GitLab project with CI/CD enabled
2. Kubernetes cluster with access configured
3. GitLab Container Registry access
4. Kubernetes service account with deployment permissions

## GitLab CI/CD Variables

Configure the following variables in GitLab under **Settings > CI/CD > Variables**:

### Container Registry (Automatic)
- `CI_REGISTRY` - Automatically set by GitLab
- `CI_REGISTRY_USER` - Automatically set by GitLab
- `CI_REGISTRY_PASSWORD` - Automatically set by GitLab

### Staging Environment

| Variable | Description | Example |
|----------|-------------|---------|
| `K8S_STAGING_SERVER` | Kubernetes API server URL | `https://staging-k8s.example.com:6443` |
| `K8S_STAGING_CA_CERT` | Base64-encoded CA certificate | `LS0tLS1CRUdJTi...` |
| `K8S_STAGING_TOKEN` | Service account token | `eyJhbGciOiJSUzI1NiIs...` |
| `STAGING_URL` | Staging environment URL | `https://staging.fitscan.com` |

### Production Environment

| Variable | Description | Example |
|----------|-------------|---------|
| `K8S_PRODUCTION_SERVER` | Kubernetes API server URL | `https://prod-k8s.example.com:6443` |
| `K8S_PRODUCTION_CA_CERT` | Base64-encoded CA certificate | `LS0tLS1CRUdJTi...` |
| `K8S_PRODUCTION_TOKEN` | Service account token | `eyJhbGciOiJSUzI1NiIs...` |
| `PRODUCTION_URL` | Production environment URL | `https://fitscan.com` |

## Setting Up Kubernetes Authentication

### Option 1: Using Service Account Token (Recommended)

1. **Create a service account in Kubernetes:**
```bash
kubectl create serviceaccount gitlab-deployer -n fitscan
```

2. **Create a ClusterRoleBinding (for cluster-wide access) or RoleBinding (for namespace access):**
```bash
# For namespace-scoped access (recommended)
kubectl create rolebinding gitlab-deployer-binding \
  --clusterrole=edit \
  --serviceaccount=fitscan:gitlab-deployer \
  --namespace=fitscan

# Or for cluster-wide access
kubectl create clusterrolebinding gitlab-deployer-binding \
  --clusterrole=edit \
  --serviceaccount=fitscan:gitlab-deployer
```

3. **Get the service account token:**
```bash
# Get the secret name
SECRET_NAME=$(kubectl get serviceaccount gitlab-deployer -n fitscan -o jsonpath='{.secrets[0].name}')

# Extract the token
kubectl get secret $SECRET_NAME -n fitscan -o jsonpath='{.data.token}' | base64 -d
```

4. **Get the CA certificate:**
```bash
kubectl get secret $SECRET_NAME -n fitscan -o jsonpath='{.data.ca\.crt}'
```

5. **Add to GitLab CI/CD variables:**
   - `K8S_STAGING_TOKEN`: Paste the decoded token
   - `K8S_STAGING_CA_CERT`: Paste the base64-encoded CA cert (as-is)
   - `K8S_STAGING_SERVER`: Your Kubernetes API server URL

### Option 2: Using GitLab Kubernetes Integration

1. Go to **Settings > Kubernetes** in your GitLab project
2. Add your Kubernetes cluster
3. GitLab will automatically create the necessary variables

## Pipeline Stages

### 1. Validate
- Validates YAML syntax
- Validates Kubernetes manifests
- Validates Dockerfile

### 2. Test
- Runs linting
- Runs type checking
- (Optional) Runs unit tests

### 3. Build
- Builds Docker image
- Tags with commit SHA, branch name, and latest
- Pushes to GitLab Container Registry

### 4. Security
- Runs Trivy security scan
- Generates security report

### 5. Deploy Staging
- Deploys to staging Kubernetes cluster
- Manual trigger for `develop` or `staging` branches
- Updates image references using kustomize

### 6. Deploy Production
- Deploys to production Kubernetes cluster
- Manual trigger for `main`/`master` branch
- Includes health checks and status verification

## Deployment Process

### Automatic Builds
- Every push to any branch triggers build
- Images are tagged with commit SHA and branch name
- Latest tag only for default branch

### Manual Deployments
- Staging: Available for `develop`/`staging` branches
- Production: Available for default branch (`main`/`master`)
- Rollback: Available for production deployments

### Image Tagging Strategy
- `$CI_COMMIT_SHORT_SHA` - Commit SHA (e.g., `a1b2c3d`)
- `$CI_COMMIT_REF_SLUG` - Branch name (e.g., `develop`, `main`)
- `latest` - Only for default branch

## Using Kustomize

The pipeline uses Kustomize to update image references:

```yaml
kustomize edit set image fitscan=$IMAGE_NAME:$IMAGE_TAG
```

This automatically updates the image in `k8s/app.yaml` and `k8s/processor.yaml`.

## GitLab Runner Configuration

### Required Tags
- `docker` - For build jobs (Docker-in-Docker)
- `kubernetes` - For deployment jobs (kubectl access)

### Runner Setup
```toml
[[runners]]
  name = "docker-runner"
  executor = "docker"
  [runners.docker]
    privileged = true
    volumes = ["/cache"]
  tags = ["docker"]

[[runners]]
  name = "kubernetes-runner"
  executor = "kubernetes"
  [runners.kubernetes]
    namespace = "gitlab-runner"
  tags = ["kubernetes"]
```

## Troubleshooting

### Build Fails
1. Check Docker-in-Docker service is running
2. Verify GitLab Container Registry credentials
3. Check Dockerfile syntax

### Deployment Fails
1. Verify Kubernetes credentials in CI/CD variables
2. Check service account has correct permissions
3. Verify namespace exists: `kubectl get namespace fitscan`
4. Check kubectl can connect: `kubectl cluster-info`

### Image Pull Errors
1. Verify image exists in registry: `docker pull $IMAGE_NAME:$IMAGE_TAG`
2. Check image pull secrets in Kubernetes
3. Verify service account has image pull permissions

### Permission Denied
1. Check RoleBinding/ClusterRoleBinding exists
2. Verify service account token is valid
3. Check namespace permissions

## Security Best Practices

1. **Use Protected Variables**: Mark sensitive variables as "Protected" and "Masked"
2. **Limit Token Scope**: Use namespace-scoped RoleBinding instead of ClusterRoleBinding
3. **Rotate Tokens**: Regularly rotate service account tokens
4. **Use GitLab Environments**: Configure environments for better tracking
5. **Enable Deployment Approvals**: Require approvals for production deployments

## Advanced Configuration

### Custom Image Registry
If using a custom registry instead of GitLab Container Registry:

```yaml
variables:
  IMAGE_NAME: "registry.example.com/fitscan"
  DOCKER_REGISTRY: "registry.example.com"
  DOCKER_USERNAME: $CUSTOM_REGISTRY_USER
  DOCKER_PASSWORD: $CUSTOM_REGISTRY_PASSWORD
```

### Multi-Environment Setup
To add more environments (e.g., `dev`, `qa`):

1. Add new stage: `deploy-dev`
2. Create new deployment job
3. Add corresponding CI/CD variables
4. Configure environment-specific settings

### Blue-Green Deployment
For zero-downtime deployments, modify the deployment job to:
1. Deploy new version to separate namespace
2. Run smoke tests
3. Switch traffic using Ingress
4. Keep old version for rollback

## Monitoring Deployments

### GitLab Environments
- View deployments in **Operations > Environments**
- Track deployment history
- View environment URLs

### Kubernetes Events
```bash
kubectl get events -n fitscan --sort-by='.lastTimestamp'
```

### Pod Logs
```bash
kubectl logs -f deployment/fitscan-app -n fitscan
```

## Rollback Procedure

### Via GitLab CI/CD
1. Go to **CI/CD > Pipelines**
2. Find the last successful production deployment
3. Click **Rollback** button

### Via kubectl
```bash
kubectl rollout undo deployment/fitscan-app -n fitscan
kubectl rollout undo deployment/fitscan-processor -n fitscan
```

## Additional Resources

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Kubernetes Deployment Best Practices](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kustomize Documentation](https://kustomize.io/)

