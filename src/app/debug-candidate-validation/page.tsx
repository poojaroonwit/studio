'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function DebugCandidateValidationPage() {
  const [jsonData, setJsonData] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!jsonData.trim()) {
      setResult({ error: 'Please enter JSON data to validate' });
      return;
    }

    setLoading(true);
    try {
      const data = JSON.parse(jsonData);
      
      const response = await fetch('/api/debug/candidate-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();
      setResult(result);
    } catch (error) {
      setResult({ 
        error: 'Failed to validate data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    const example = {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      status: "Applied",
      fitScore: 0.85,
      positionId: "123e4567-e89b-12d3-a456-426614174000",
      recruiterId: "123e4567-e89b-12d3-a456-426614174001",
      sourceId: "123e4567-e89b-12d3-a456-426614174002",
      custom_attributes: {
        experience: "5 years",
        skills: ["JavaScript", "React", "Node.js"]
      }
    };
    setJsonData(JSON.stringify(example, null, 2));
  };

  const loadInvalidExample = () => {
    const invalidExample = {
      name: "", // Invalid: empty name
      email: "invalid-email", // Invalid: not a valid email
      fitScore: 1.5, // Invalid: out of range
      positionId: "invalid-uuid", // Invalid: not a valid UUID
      status: "", // Invalid: empty status
      custom_attributes: "not an object" // Invalid: should be an object
    };
    setJsonData(JSON.stringify(invalidExample, null, 2));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Candidate Validation Debug Tool</h1>
        <p className="text-muted-foreground">
          Use this tool to test candidate data validation and identify what's causing "Invalid input" errors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Data</CardTitle>
            <CardDescription>
              Enter the candidate data you want to validate in JSON format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="Enter JSON data here..."
              className="min-h-[300px] font-mono text-sm"
            />
            
            <div className="flex gap-2">
              <Button onClick={loadExample} variant="outline" size="sm">
                Load Valid Example
              </Button>
              <Button onClick={loadInvalidExample} variant="outline" size="sm">
                Load Invalid Example
              </Button>
              <Button onClick={handleValidate} disabled={loading} className="ml-auto">
                {loading ? 'Validating...' : 'Validate Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation Result</CardTitle>
            <CardDescription>
              Results of the validation check
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result && (
              <div className="space-y-4">
                {result.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{result.error}</AlertDescription>
                    {result.details && (
                      <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded">
                        {result.details}
                      </pre>
                    )}
                  </Alert>
                ) : result.valid ? (
                  <Alert>
                    <AlertDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✓ Valid
                      </Badge>
                      {result.message}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        ✗ Invalid
                      </Badge>
                      {result.message}
                    </AlertDescription>
                  </Alert>
                )}

                {result.errors && Object.keys(result.errors).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Field Errors:</h4>
                    <div className="space-y-2">
                      {Object.entries(result.errors).map(([field, errors]) => (
                        <div key={field} className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="font-medium text-red-800">{field}:</div>
                          <ul className="text-sm text-red-700 mt-1">
                            {Array.isArray(errors) ? errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            )) : (
                              <li>• {errors}</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.formErrors && result.formErrors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Form Errors:</h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <ul className="text-sm text-yellow-800">
                        {result.formErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {result.details && (
                  <div>
                    <h4 className="font-semibold mb-2">Validation Details:</h4>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}

                {result.receivedData && (
                  <div>
                    <h4 className="font-semibold mb-2">Received Data:</h4>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(result.receivedData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Common Validation Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Required Fields:</h4>
              <ul className="text-sm space-y-1">
                <li>• <code>name</code> - Cannot be empty if provided</li>
                <li>• <code>email</code> - Must be valid email format if provided</li>
                <li>• <code>status</code> - Cannot be empty if provided</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Data Types:</h4>
              <ul className="text-sm space-y-1">
                <li>• <code>fitScore</code> - Number between 0-1 or null</li>
                <li>• <code>positionId</code> - Valid UUID or null</li>
                <li>• <code>recruiterId</code> - Valid UUID or null</li>
                <li>• <code>sourceId</code> - Valid UUID or null</li>
                <li>• <code>custom_attributes</code> - Object/record</li>
                <li>• <code>assignmentJustification</code> - Array of strings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
