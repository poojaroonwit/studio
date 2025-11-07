#!/bin/bash

# Script to create Kubernetes service account for GitLab CI/CD
# Usage: ./setup-gitlab-serviceaccount.sh [namespace] [service-account-name]

set -e

NAMESPACE="${1:-fitscan}"
SERVICE_ACCOUNT="${2:-gitlab-deployer}"

echo "Creating service account for GitLab CI/CD..."
echo "Namespace: $NAMESPACE"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create service account
kubectl create serviceaccount "$SERVICE_ACCOUNT" -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create RoleBinding for namespace-scoped access
echo "Creating RoleBinding for namespace-scoped access..."
kubectl create rolebinding "${SERVICE_ACCOUNT}-binding" \
  --clusterrole=edit \
  --serviceaccount="${NAMESPACE}:${SERVICE_ACCOUNT}" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

# Wait for secret to be created
echo "Waiting for service account token to be created..."
sleep 5

# Get the secret name
SECRET_NAME=$(kubectl get serviceaccount "$SERVICE_ACCOUNT" -n "$NAMESPACE" -o jsonpath='{.secrets[0].name}')

if [ -z "$SECRET_NAME" ]; then
  echo "Error: Service account token not found. Creating token manually..."
  
  # For Kubernetes 1.24+, create token manually
  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ${SERVICE_ACCOUNT}-token
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/service-account.name: $SERVICE_ACCOUNT
type: kubernetes.io/service-account-token
EOF
  
  SECRET_NAME="${SERVICE_ACCOUNT}-token"
  sleep 5
fi

# Extract token
TOKEN=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.token}' | base64 -d)

# Get CA certificate
CA_CERT=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}')

# Get server URL
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

echo ""
echo "=========================================="
echo "GitLab CI/CD Variables"
echo "=========================================="
echo ""
echo "Add these variables in GitLab:"
echo "Settings > CI/CD > Variables"
echo ""
echo "K8S_STAGING_SERVER (or K8S_PRODUCTION_SERVER):"
echo "$SERVER"
echo ""
echo "K8S_STAGING_CA_CERT (or K8S_PRODUCTION_CA_CERT):"
echo "$CA_CERT"
echo ""
echo "K8S_STAGING_TOKEN (or K8S_PRODUCTION_TOKEN):"
echo "$TOKEN"
echo ""
echo "=========================================="
echo ""
echo "✓ Service account created successfully!"
echo ""
echo "Note: Mark these variables as 'Protected' and 'Masked' in GitLab"
echo ""

