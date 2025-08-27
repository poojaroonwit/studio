"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestLogoPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [testCount, setTestCount] = useState(0);

  const testLogoUpdate = () => {
    const testUrl = `https://via.placeholder.com/100x100/ff0000/ffffff?text=Test${testCount}`;
    setLogoUrl(testUrl);
    setTestCount(prev => prev + 1);
    
    console.log('Dispatching test appConfigChanged event with logoUrl:', testUrl);
    window.dispatchEvent(new CustomEvent('appConfigChanged', {
      detail: {
        logoUrl: testUrl,
        appName: 'Test App',
      }
    }));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Logo Test Page</h1>
      
      <div className="space-y-4">
        <Button onClick={testLogoUpdate}>
          Test Logo Update (Count: {testCount})
        </Button>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Current Logo URL:</h2>
          <p className="text-sm text-gray-600">{logoUrl || 'No logo set'}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click the button above to test logo updates</li>
            <li>Check the browser console for debug messages</li>
            <li>Look at the sidebar to see if the logo changes</li>
            <li>If the logo doesn't change, check for console errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
