"use client";

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Loader2, CheckCircle, XCircle, Server } from 'lucide-react';

interface HealthCheckProps {
  onHealthStatus?: (isHealthy: boolean) => void;
}

export function HealthCheck({ onHealthStatus }: HealthCheckProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    api: boolean | null;
    database: boolean | null;
    minio: boolean | null;
  }>({
    api: null,
    database: null,
    minio: null,
  });

  const checkHealth = async () => {
    setIsChecking(true);
    const newStatus = { ...healthStatus };

    try {
      // Check API health
      const apiResponse = await fetch('/api/health', { 
        signal: AbortSignal.timeout(5000) 
      });
      newStatus.api = apiResponse.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      newStatus.api = false;
    }

    try {
      // Check database through candidates API
      const dbResponse = await fetch('/api/candidates?limit=1', { 
        signal: AbortSignal.timeout(10000) 
      });
      newStatus.database = dbResponse.ok || dbResponse.status === 401; // 401 means DB is working but auth failed
    } catch (error) {
      console.error('Database health check failed:', error);
      newStatus.database = false;
    }

    try {
      // Check MinIO through positions API (which might use MinIO)
      const minioResponse = await fetch('/api/positions', { 
        signal: AbortSignal.timeout(5000) 
      });
      newStatus.minio = minioResponse.ok;
    } catch (error) {
      console.error('MinIO health check failed:', error);
      newStatus.minio = false;
    }

    setHealthStatus(newStatus);
    setIsChecking(false);

    const isHealthy = Object.values(newStatus).every(status => status === true);
    onHealthStatus?.(isHealthy);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const allHealthy = Object.values(healthStatus).every(status => status === true);
  const hasErrors = Object.values(healthStatus).some(status => status === false);
  const isCheckingAny = Object.values(healthStatus).some(status => status === null);

  if (isCheckingAny) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking server status...</AlertTitle>
        <AlertDescription>
          Verifying that all services are running properly.
        </AlertDescription>
      </Alert>
    );
  }

  if (allHealthy) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">All systems operational</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Server, database, and storage services are running normally.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasErrors) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200">Server issues detected</AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300 space-y-2">
          <div>
            {!healthStatus.api && "• API server is not responding"}
            {!healthStatus.database && "• Database connection failed"}
            {!healthStatus.minio && "• File storage service unavailable"}
          </div>
          <Button 
            onClick={checkHealth} 
            disabled={isChecking}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Server className="h-4 w-4 mr-2" />}
            {isChecking ? 'Checking...' : 'Retry Health Check'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
} 