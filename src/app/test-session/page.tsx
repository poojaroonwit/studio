"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function TestSessionPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-session');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Error checking session:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Debug Information</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Client-Side Session Status</h2>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Session:</strong> {session ? 'Present' : 'Not present'}</p>
          {session && (
            <div className="mt-2">
              <p><strong>User ID:</strong> {session.user?.id}</p>
              <p><strong>User Name:</strong> {session.user?.name}</p>
              <p><strong>User Email:</strong> {session.user?.email}</p>
              <p><strong>Expires:</strong> {session.expires}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Server-Side Session Check</h2>
          <button 
            onClick={checkSession}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Session'}
          </button>
          
          {debugInfo && (
            <div className="mt-4">
              <pre className="bg-white p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Upload Queue Test</h2>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/upload-queue?limit=1');
                const data = await response.json();
                console.log('Upload queue response:', data);
                alert(response.ok ? 'Upload queue accessible' : `Error: ${data.error}`);
              } catch (error) {
                console.error('Upload queue error:', error);
                alert('Error accessing upload queue');
              }
            }}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Test Upload Queue Access
          </button>
        </div>
      </div>
    </div>
  );
}
