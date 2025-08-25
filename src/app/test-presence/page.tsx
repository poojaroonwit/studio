"use client";

import { useUserPresence } from '@/hooks/use-user-presence';
import { useSession } from 'next-auth/react';
import { UserPresenceIndicator } from '@/components/ui/user-presence-indicator';

export default function TestPresencePage() {
  const { data: session } = useSession();
  const { onlineUsers, isLoading, error, updatePresence, fetchPresence } = useUserPresence();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">User Presence Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Presence Indicator */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Presence Indicator</h2>
          <UserPresenceIndicator />
        </div>

        {/* Debug Information */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Current User:</strong> {session?.user?.name || 'Not logged in'}
            </div>
            <div>
              <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Error:</strong> {error || 'None'}
            </div>
            <div>
              <strong>Total Users:</strong> {onlineUsers.length}
            </div>
            <div>
              <strong>Online Users:</strong> {onlineUsers.filter(u => u.isOnline).length}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Manual Controls</h2>
        <div className="flex gap-2">
          <button
            onClick={updatePresence}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Update Presence
          </button>
          <button
            onClick={fetchPresence}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Fetch Presence
          </button>
        </div>
      </div>

      {/* Raw Data */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Raw Presence Data</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
          {JSON.stringify(onlineUsers, null, 2)}
        </pre>
      </div>
    </div>
  );
}
