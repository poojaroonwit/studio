'use client';

import { useEffect, useState } from 'react';
import { testR } from '@/lib/ramda-polyfill';

export function RamdaTest() {
  const [testResult, setTestResult] = useState<string>('Testing...');
  const [globalRStatus, setGlobalRStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Test the R polyfill
    const runTests = () => {
      try {
        // Test if R is available globally
        if (typeof (window as any).R !== 'undefined') {
          setGlobalRStatus('✅ R is available globally');
          
          // Test if R.filter is a function
          if (typeof (window as any).R.filter === 'function') {
            setGlobalRStatus('✅ R is available globally and R.filter is a function');
          } else {
            setGlobalRStatus('❌ R is available globally but R.filter is not a function');
          }
        } else {
          setGlobalRStatus('❌ R is not available globally');
        }

        // Run the test function
        const result = testR();
        setTestResult(result ? '✅ R polyfill test passed' : '❌ R polyfill test failed');
      } catch (error) {
        setTestResult(`❌ R polyfill test error: ${error}`);
        setGlobalRStatus(`❌ Error checking global R: ${error}`);
      }
    };

    // Run tests after a short delay to ensure everything is loaded
    const timeoutId = setTimeout(runTests, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <h3 className="font-semibold mb-2">Ramda Polyfill Test</h3>
      <div className="space-y-2 text-sm">
        <div>Global R Status: {globalRStatus}</div>
        <div>Test Result: {testResult}</div>
      </div>
    </div>
  );
}
