'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { testPositionEndpoint, validatePositionId } from '@/lib/position-debug';

interface PositionDebugResult {
  positionId: string;
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  timestamp: string;
}

export function PositionDebugPanel() {
  const [positionId, setPositionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PositionDebugResult[]>([]);

  const handleTest = async () => {
    if (!positionId.trim()) return;

    setIsLoading(true);
    
    try {
      const result = await testPositionEndpoint(positionId.trim());
      const debugResult: PositionDebugResult = {
        positionId: positionId.trim(),
        ...result,
        timestamp: new Date().toISOString(),
      };
      
      setResults(prev => [debugResult, ...prev.slice(0, 9)]); // Keep last 10 results
    } catch (error) {
      const debugResult: PositionDebugResult = {
        positionId: positionId.trim(),
        success: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      
      setResults(prev => [debugResult, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidId = validatePositionId(positionId);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Position Loading Debug Panel
        </CardTitle>
        <CardDescription>
          Test position loading and diagnose issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter position ID (UUID format)"
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleTest} 
            disabled={isLoading || !isValidId}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Test'
            )}
          </Button>
        </div>

        {positionId && !isValidId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Invalid position ID format. Please enter a valid UUID.
            </AlertDescription>
          </Alert>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Test Results</h3>
            {results.map((result, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-mono text-sm">{result.positionId}</span>
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-2">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>

                  {result.success && result.data && (
                    <div className="text-sm">
                      <div><strong>Title:</strong> {result.data.title}</div>
                      <div><strong>Department:</strong> {result.data.department}</div>
                      <div><strong>Status:</strong> {result.data.isOpen ? 'Open' : 'Closed'}</div>
                    </div>
                  )}

                  {result.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription className="text-xs">
                        {result.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
