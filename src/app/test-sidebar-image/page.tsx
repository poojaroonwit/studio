"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { applySidebarBackgroundSettings } from '@/lib/themeUtils';

export default function TestSidebarImagePage() {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(true);

  const addTestResult = (result: string) => {
    if (isMounted) {
      setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const testCacheBusting = () => {
    addTestResult('Testing cache busting...');
    
    // Test with a sample image URL
    const testUrl = 'https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Test+Image+1';
    
    // Apply the image as sidebar background
    applySidebarBackgroundSettings({
      sidebarBackgroundType: 'image',
      sidebarBackgroundImageUrl: testUrl,
      sidebarBackgroundImageFit: 'cover',
      sidebarBackgroundImagePosition: 'center',
    });
    
    setCurrentImageUrl(testUrl);
    addTestResult(`Applied test image: ${testUrl}`);
    
    // Simulate a new image upload after 2 seconds
    setTimeout(() => {
      const newUrl = 'https://via.placeholder.com/300x200/00FF00/FFFFFF?text=Test+Image+2';
      
      applySidebarBackgroundSettings({
        sidebarBackgroundType: 'image',
        sidebarBackgroundImageUrl: newUrl,
        sidebarBackgroundImageFit: 'cover',
        sidebarBackgroundImagePosition: 'center',
      });
      
      setCurrentImageUrl(newUrl);
      addTestResult(`Applied new test image: ${newUrl}`);
      addTestResult('Cache busting should have forced the new image to load immediately');
    }, 2000);
  };

  const resetToGradient = () => {
    applySidebarBackgroundSettings({
      sidebarBackgroundType: 'gradient',
      sidebarBackgroundImageUrl: '',
      sidebarBackgroundImageFit: 'cover',
      sidebarBackgroundImagePosition: 'center',
    });
    
    setCurrentImageUrl('');
    addTestResult('Reset to gradient background');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Image Cache Busting Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This page tests the sidebar image cache busting functionality. 
              The test will apply a red test image, then automatically switch to a green test image after 2 seconds.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Current Image:</strong> {currentImageUrl || 'None (gradient)'}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={testCacheBusting} variant="default">
              Start Cache Busting Test
            </Button>
            <Button onClick={resetToGradient} variant="outline">
              Reset to Gradient
            </Button>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Test Results:</h3>
            <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No test results yet. Click "Start Cache Busting Test" to begin.</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Instructions:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click "Start Cache Busting Test" to begin</li>
              <li>Watch the sidebar background change from red to green after 2 seconds</li>
              <li>If the image changes immediately without refresh, cache busting is working</li>
              <li>Click "Reset to Gradient" to return to the default background</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
