'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncUserRolesProps {
  className?: string;
}

export function SyncUserRoles({ className }: SyncUserRolesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<{
    success: boolean;
    updated: number;
    skipped: number;
    total: number;
    message: string;
  } | null>(null);

  const handleSyncRoles = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/settings/sync-user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLastSync(data);
        toast.success('User roles synchronized successfully');
      } else {
        throw new Error(data.error || 'Failed to sync user roles');
      }
    } catch (error) {
      console.error('Error syncing user roles:', error);
      toast.error('Failed to sync user roles');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync User Roles
        </CardTitle>
        <CardDescription>
          Synchronize user roles with their group permissions. This ensures that user roles match their actual permission levels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>What this does:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Checks all users' group permissions</li>
            <li>Updates user roles to match their permission levels</li>
            <li>Ensures Admin users have Admin role</li>
            <li>Ensures Recruiter users have Recruiter role</li>
            <li>Ensures Hiring Manager users have Hiring Manager role</li>
          </ul>
        </div>

        <Button 
          onClick={handleSyncRoles} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing Roles...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync User Roles
            </>
          )}
        </Button>

        {lastSync && (
          <Alert className={lastSync.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {lastSync.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={lastSync.success ? 'text-green-800' : 'text-red-800'}>
                {lastSync.message}
              </AlertDescription>
            </div>
            {lastSync.success && (
              <div className="mt-2 text-sm text-green-700">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="font-medium">Updated:</span> {lastSync.updated}
                  </div>
                  <div>
                    <span className="font-medium">Skipped:</span> {lastSync.skipped}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> {lastSync.total}
                  </div>
                </div>
              </div>
            )}
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> Users may need to sign out and sign back in for role changes to take effect.</p>
        </div>
      </CardContent>
    </Card>
  );
}
