# Kubernetes Best Practices Implementation Guide

This document outlines the Kubernetes best practices implemented in this deployment.

## Overview

The FitScan application stack is deployed on Kubernetes following industry best practices for production-ready deployments.

## Implemented Best Practices

### 1. Security

#### ServiceAccounts
- **File**: `serviceaccounts.yaml`
- Each component has its own ServiceAccount for RBAC
- ServiceAccounts are properly scoped with minimal permissions
- Token mounting is controlled per component

#### Security Contexts
- All pods run as non-root users
- Security contexts defined at both pod and container levels
- Capabilities are dropped (principle of least privilege)
- Seccomp profiles enabled (RuntimeDefault)

#### Network Policies
- **File**: `network-policies.yaml`
- Network isolation between components
- Ingress/egress rules defined for each service
- DNS access allowed for service discovery
- External API access (HTTPS/HTTP) for webhooks

### 2. High Availability

#### Pod Disruption Budgets (PDB)
- **File**: `pod-disruption-budgets.yaml`
- Ensures minimum availability during voluntary disruptions
- Configured for app, postgres, and minio
- Uses `IfHealthyBudget` policy

#### Deployment Strategies
- **Rolling Updates**: For stateless services (app, processor)
  - `maxSurge: 1` - allows one extra pod during updates
  - `maxUnavailable: 0` - ensures zero downtime
- **Recreate**: For stateful services (postgres, minio)
  - Ensures data consistency during updates

#### Horizontal Pod Autoscaling (HPA)
- **File**: `hpa.yaml`
- Auto-scaling based on CPU and memory metrics
- App: 2-10 replicas (70% CPU, 80% memory)
- Processor: 1-5 replicas (70% CPU, 80% memory)
- Configurable scale-up/down policies

### 3. Resource Management

#### Resource Quotas
- **File**: `resource-quotas.yaml`
- Namespace-level resource limits
- Prevents resource exhaustion
- Limits: 16 CPU, 64Gi memory, 20 pods

#### Limit Ranges
- Default resource requests/limits for containers
- Min/Max constraints per container
- Prevents resource starvation

#### Resource Requests and Limits
- All containers have defined requests and limits
- Requests: minimum guaranteed resources
- Limits: maximum allowed resources
- Prevents resource contention

### 4. Health Checks

#### Startup Probes
- Ensures containers are fully started before traffic routing
- Prevents premature traffic to starting containers
- Longer timeout for slow-starting services

#### Liveness Probes
- Detects and restarts unhealthy containers
- HTTP probes for web services
- Exec probes for background processes

#### Readiness Probes
- Determines when containers are ready to receive traffic
- Prevents traffic to containers that aren't ready
- Faster than liveness probes for quick recovery

### 5. Initialization

#### Init Containers
- Database readiness checks before app startup
- Ensures dependencies are available
- Prevents connection errors during startup

### 6. Observability

#### Prometheus Annotations
- Health check endpoints exposed for scraping
- Metrics collection ready
- Standard Prometheus annotations

#### Labels and Annotations
- Consistent labeling using Kubernetes recommended labels
- `app.kubernetes.io/*` standard labels
- Component and version tracking

### 7. Image Management

#### Image Pull Policies
- `IfNotPresent` for local/private registries
- Reduces unnecessary image pulls
- Can be changed to `Always` for CI/CD pipelines

### 8. Graceful Shutdown

#### Termination Grace Period
- 30 seconds grace period for clean shutdown
- Allows in-flight requests to complete
- Prevents data loss during restarts

## Component-Specific Configurations

### Application (fitscan-app)
- **Replicas**: 2 (scales 2-10 with HPA)
- **Strategy**: RollingUpdate
- **Health Endpoint**: `/api/health`
- **Init Container**: Waits for PostgreSQL
- **Resources**: 2Gi-8Gi memory, 500m-2 CPU

### Processor (fitscan-processor)
- **Replicas**: 1 (scales 1-5 with HPA)
- **Strategy**: RollingUpdate
- **Health Check**: Process check
- **Init Container**: Waits for PostgreSQL
- **Resources**: 1Gi-4Gi memory, 250m-1 CPU

### PostgreSQL
- **Replicas**: 1 (stateful, not scaled)
- **Strategy**: Recreate
- **Health Check**: `pg_isready`
- **Resources**: 2Gi-8Gi memory, 500m-2 CPU
- **Storage**: 20Gi persistent volume

### MinIO
- **Replicas**: 1 (stateful, not scaled)
- **Strategy**: Recreate
- **Health Endpoints**: `/minio/health/live`, `/minio/health/ready`
- **Resources**: 2Gi-8Gi memory, 500m-2 CPU
- **Storage**: 50Gi persistent volume

## Deployment Order

When deploying for the first time, follow this order:

1. **Namespace**: `kubectl apply -f namespace.yaml`
2. **Secrets**: `kubectl apply -f secrets.yaml` (update with real values!)
3. **ConfigMap**: `kubectl apply -f configmap.yaml`
4. **ServiceAccounts**: `kubectl apply -f serviceaccounts.yaml`
5. **Resource Quotas**: `kubectl apply -f resource-quotas.yaml`
6. **Persistent Volumes**: `kubectl apply -f persistent-volumes.yaml`
7. **PostgreSQL**: `kubectl apply -f postgres.yaml`
8. **MinIO**: `kubectl apply -f minio.yaml`
9. **App**: `kubectl apply -f app.yaml`
10. **Processor**: `kubectl apply -f processor.yaml`
11. **Ingress**: `kubectl apply -f ingress.yaml`
12. **PDBs**: `kubectl apply -f pod-disruption-budgets.yaml`
13. **HPA**: `kubectl apply -f hpa.yaml`
14. **Network Policies**: `kubectl apply -f network-policies.yaml`

Or use Kustomize:
```bash
kubectl apply -k k8s/
```

## Monitoring and Maintenance

### Check Pod Status
```bash
kubectl get pods -n fitscan
```

### Check HPA Status
```bash
kubectl get hpa -n fitscan
```

### Check Resource Usage
```bash
kubectl top pods -n fitscan
```

### View Logs
```bash
kubectl logs -f deployment/fitscan-app -n fitscan
```

### Check Network Policies
```bash
kubectl get networkpolicies -n fitscan
```

## Security Considerations

1. **Secrets Management**: 
   - Never commit real secrets to git
   - Use Kubernetes Secrets or external secret managers (e.g., Sealed Secrets, External Secrets Operator)
   - Rotate secrets regularly

2. **Image Security**:
   - Use specific image tags instead of `latest`
   - Scan images for vulnerabilities
   - Use private registries

3. **Network Security**:
   - Network policies are enabled by default
   - Review and adjust based on your security requirements
   - Consider using TLS for internal communication

4. **RBAC**:
   - ServiceAccounts are created but may need Role/RoleBinding for specific permissions
   - Follow principle of least privilege

## Customization

### Adjusting Resource Limits
Edit the resource requests/limits in respective deployment files:
- `app.yaml` - Application resources
- `processor.yaml` - Processor resources
- `postgres.yaml` - Database resources
- `minio.yaml` - Storage resources

### Adjusting HPA
Edit `hpa.yaml` to change:
- Min/max replicas
- Target CPU/memory utilization
- Scaling behavior

### Adjusting Storage
Edit `persistent-volumes.yaml` to change:
- Storage size
- Storage class
- Access modes

## Troubleshooting

### Pods Not Starting
1. Check pod events: `kubectl describe pod <pod-name> -n fitscan`
2. Check logs: `kubectl logs <pod-name> -n fitscan`
3. Verify secrets/configmaps exist
4. Check resource quotas aren't exceeded

### Database Connection Issues
1. Verify PostgreSQL is running: `kubectl get pods -n fitscan | grep postgres`
2. Check init container logs
3. Verify DATABASE_URL environment variable

### Network Policy Issues
1. Temporarily disable network policies for testing
2. Check pod labels match network policy selectors
3. Verify ingress/egress rules

## Additional Recommendations

1. **Backup Strategy**: Implement regular backups for PostgreSQL and MinIO
2. **Monitoring**: Set up Prometheus and Grafana for comprehensive monitoring
3. **Logging**: Consider centralized logging (e.g., ELK, Loki)
4. **CI/CD**: Automate deployments with GitOps (e.g., ArgoCD, Flux)
5. **Disaster Recovery**: Plan for disaster recovery scenarios
6. **Certificate Management**: Use cert-manager for automatic TLS certificates

## References

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [Production Best Practices](https://kubernetes.io/docs/setup/best-practices/)

