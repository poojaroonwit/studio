# FitScan Kubernetes Deployment Script (PowerShell)
# This script helps deploy the FitScan application to Kubernetes

param(
    [string]$Registry = "",
    [string]$Tag = "latest",
    [string]$Namespace = "fitscan",
    [switch]$DryRun,
    [switch]$Delete,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Help
)

# Configuration
$ImageName = "fitscan"
$K8sDir = "k8s"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Help {
    Write-Host @"
FitScan Kubernetes Deployment Script (PowerShell)

Usage: .\deploy.ps1 [OPTIONS]

Options:
    -Registry REGISTRY    Set the container registry (e.g., docker.io/username)
    -Tag TAG             Set the image tag (default: latest)
    -Namespace NS        Set the namespace (default: fitscan)
    -DryRun              Show what would be deployed without actually deploying
    -Delete              Delete the deployment
    -Status              Show deployment status
    -Logs                Show application logs
    -Help                Show this help message

Examples:
    .\deploy.ps1 -Registry "docker.io/username" -Tag "v1.0.0"
    .\deploy.ps1 -DryRun
    .\deploy.ps1 -Delete
    .\deploy.ps1 -Status
    .\deploy.ps1 -Logs

"@
}

function Test-Prerequisites {
    # Check if kubectl is available
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Error "kubectl is not installed or not in PATH"
        exit 1
    }

    # Check if cluster is accessible
    try {
        kubectl cluster-info | Out-Null
    }
    catch {
        Write-Error "Cannot connect to Kubernetes cluster"
        exit 1
    }
}

function Get-FullImageName {
    if ($Registry) {
        return "${Registry}/${ImageName}:${Tag}"
    }
    return "${ImageName}:${Tag}"
}

function Show-Status {
    Write-Info "Deployment Status:"
    Write-Host ""
    
    try {
        kubectl get all -n $Namespace
    }
    catch {
        Write-Warning "Namespace '$Namespace' does not exist or has no resources"
        return
    }
    
    Write-Host ""
    Write-Info "Pod Status:"
    kubectl get pods -n $Namespace -o wide
    
    Write-Host ""
    Write-Info "Service Status:"
    kubectl get services -n $Namespace
    
    Write-Host ""
    Write-Info "Ingress Status:"
    kubectl get ingress -n $Namespace
}

function Show-Logs {
    Write-Info "Application Logs:"
    Write-Host ""
    
    Write-Info "Main Application:"
    try {
        kubectl logs deployment/fitscan-app -n $Namespace --tail=50
    }
    catch {
        Write-Warning "Main application deployment not found"
    }
    
    Write-Host ""
    Write-Info "Processor:"
    try {
        kubectl logs deployment/fitscan-processor -n $Namespace --tail=50
    }
    catch {
        Write-Warning "Processor deployment not found"
    }
}

function Remove-Deployment {
    Write-Warning "Deleting FitScan deployment from namespace: $Namespace"
    $confirmation = Read-Host "Are you sure? (y/N)"
    
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        Write-Info "Deleting resources..."
        kubectl delete -k $K8sDir --ignore-not-found=true
        Write-Success "Deployment deleted"
    }
    else {
        Write-Info "Deletion cancelled"
    }
}

function Update-ImageReferences {
    $FullImageName = Get-FullImageName
    Write-Info "Updating image references to: $FullImageName"
    
    # Create temporary files with updated image references
    $AppContent = Get-Content "$K8sDir/app.yaml" -Raw
    $AppContent = $AppContent -replace "fitscan:latest", $FullImageName
    $AppContent | Set-Content "$K8sDir/app-temp.yaml"
    
    $ProcessorContent = Get-Content "$K8sDir/processor.yaml" -Raw
    $ProcessorContent = $ProcessorContent -replace "fitscan:latest", $FullImageName
    $ProcessorContent | Set-Content "$K8sDir/processor-temp.yaml"
    
    # Update kustomization.yaml
    $KustomizationContent = Get-Content "$K8sDir/kustomization.yaml" -Raw
    $KustomizationContent = $KustomizationContent -replace "newTag: latest", "newTag: $Tag"
    if ($Registry) {
        $KustomizationContent = $KustomizationContent -replace "name: fitscan", "name: $Registry/$ImageName"
    }
    $KustomizationContent | Set-Content "$K8sDir/kustomization-temp.yaml"
}

function Remove-TempFiles {
    Remove-Item -Path "$K8sDir/app-temp.yaml" -ErrorAction SilentlyContinue
    Remove-Item -Path "$K8sDir/processor-temp.yaml" -ErrorAction SilentlyContinue
    Remove-Item -Path "$K8sDir/kustomization-temp.yaml" -ErrorAction SilentlyContinue
}

function Deploy {
    Write-Info "Deploying FitScan to Kubernetes..."
    
    # Update image references
    Update-ImageReferences
    
    if ($DryRun) {
        Write-Info "Dry run - showing what would be deployed:"
        kubectl apply -k $K8sDir --dry-run=client -o yaml
        Remove-TempFiles
        return
    }
    
    # Apply manifests
    Write-Info "Creating namespace..."
    kubectl apply -f "$K8sDir/namespace.yaml"
    
    Write-Info "Applying configuration..."
    kubectl apply -f "$K8sDir/configmap.yaml"
    
    Write-Info "Applying secrets..."
    kubectl apply -f "$K8sDir/secrets.yaml"
    
    Write-Info "Creating persistent volumes..."
    kubectl apply -f "$K8sDir/persistent-volumes.yaml"
    
    Write-Info "Deploying PostgreSQL..."
    kubectl apply -f "$K8sDir/postgres.yaml"
    
    Write-Info "Deploying MinIO..."
    kubectl apply -f "$K8sDir/minio.yaml"
    
    Write-Info "Deploying main application..."
    kubectl apply -f "$K8sDir/app-temp.yaml"
    
    Write-Info "Deploying processor..."
    kubectl apply -f "$K8sDir/processor-temp.yaml"
    
    Write-Info "Configuring ingress..."
    kubectl apply -f "$K8sDir/ingress.yaml"
    
    # Cleanup temporary files
    Remove-TempFiles
    
    Write-Success "Deployment completed!"
    
    # Wait for deployments to be ready
    Write-Info "Waiting for deployments to be ready..."
    try {
        kubectl wait --for=condition=available --timeout=300s deployment/fitscan-app -n $Namespace
    }
    catch {
        Write-Warning "Main application deployment did not become ready within 5 minutes"
    }
    
    try {
        kubectl wait --for=condition=available --timeout=300s deployment/fitscan-processor -n $Namespace
    }
    catch {
        Write-Warning "Processor deployment did not become ready within 5 minutes"
    }
    
    # Show final status
    Write-Host ""
    Show-Status
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    Test-Prerequisites
    
    $FullImageName = Get-FullImageName
    Write-Info "Using image: $FullImageName"
    Write-Info "Using namespace: $Namespace"
    
    if ($Delete) {
        Remove-Deployment
    }
    elseif ($Status) {
        Show-Status
    }
    elseif ($Logs) {
        Show-Logs
    }
    else {
        Deploy
    }
}

# Cleanup on exit
trap {
    Remove-TempFiles
}

# Run main function
Main
