import { PositionDebugPanel } from '@/components/debug/PositionDebugPanel';

export default function PositionDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Position Loading Debug</h1>
          <p className="text-muted-foreground">
            Use this tool to diagnose position loading issues and test the API endpoints.
          </p>
        </div>
        
        <PositionDebugPanel />
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Troubleshooting Guide</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Common Issues:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>404 Not Found:</strong> Position ID doesn't exist in the database</li>
              <li><strong>401 Unauthorized:</strong> User session is invalid or expired</li>
              <li><strong>500 Internal Server Error:</strong> Database connection or query issues</li>
              <li><strong>Network Error:</strong> API endpoint is not accessible</li>
            </ul>
            
            <p className="mt-4"><strong>How to use:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Enter a valid position ID (UUID format)</li>
              <li>Click "Test" to check the API endpoint</li>
              <li>Review the results and error messages</li>
              <li>Check the browser console for additional debug information</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
