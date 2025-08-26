"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DebugSessionPage() {
  const { data: session, status, update } = useSession();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/debug-session');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Error checking session:', error);
      setDebugData({ error: 'Failed to check session' });
    } finally {
      setLoading(false);
    }
  };

  const refreshPermissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/refresh-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setDebugData(data);
      
      // Update the session
      await update();
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      setDebugData({ error: 'Failed to refresh permissions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="p-8">Not authenticated</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Session Debug</h1>
      
      <div className="flex gap-4">
        <Button onClick={checkSession} disabled={loading}>
          Check Session
        </Button>
        <Button onClick={refreshPermissions} disabled={loading}>
          Refresh Permissions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>User ID:</strong> {session?.user?.id}
            </div>
            <div>
              <strong>Email:</strong> {session?.user?.email}
            </div>
            <div>
              <strong>Name:</strong> {session?.user?.name}
            </div>
            <div>
              <strong>Role:</strong> <Badge>{session?.user?.role || 'No role'}</Badge>
            </div>
            <div>
              <strong>Module Permissions:</strong>
              <div className="mt-2">
                {session?.user?.modulePermissions && session.user.modulePermissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {session.user.modulePermissions.map((perm: string) => (
                      <Badge key={perm} variant="secondary">{perm}</Badge>
                    ))}
                  </div>
                ) : (
                  <Badge variant="destructive">No permissions</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
