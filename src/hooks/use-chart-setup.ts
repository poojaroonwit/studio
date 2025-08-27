import { useState, useEffect, useRef } from 'react';
import { setupChartJS, isChartJSSetup, isChartJSSetupInProgress, resetChartJSSetup } from '@/lib/chartjs-setup';

export function useChartSetup() {
  const [chartReady, setChartReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeChart = async () => {
      console.log('useChartSetup: initializeChart called, chartReady:', chartReady);
      
      // If already ready, don't do anything
      if (chartReady) {
        console.log('useChartSetup: Chart already ready, returning');
        return;
      }

      // If already set up, mark as ready
      if (isChartJSSetup()) {
        console.log('useChartSetup: Chart.js already set up, marking as ready');
        setChartReady(true);
        setIsLoading(false);
        setError(null);
        return;
      }

      console.log('useChartSetup: Starting chart setup...');
      setIsLoading(true);
      setError(null);

      try {
        // Always call setupChartJS - it will return the existing promise if setup is in progress
        console.log('useChartSetup: Calling setupChartJS...');
        const startTime = Date.now();
        await setupChartJS();
        const endTime = Date.now();
        console.log(`useChartSetup: setupChartJS completed in ${endTime - startTime}ms`);
        
        // Check setup completion
        if (isChartJSSetup()) {
          console.log('useChartSetup: Chart setup successful, marking as ready');
          setChartReady(true);
          setIsLoading(false);
        } else {
          console.error('useChartSetup: Chart setup failed - isChartJSSetup() returned false');
          setError('Chart setup failed');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('useChartSetup: Chart setup error:', err);
        setError(err instanceof Error ? err.message : 'Chart setup failed');
        setIsLoading(false);
      }
    };

    initializeChart();
  }, []); // Remove chartReady from dependency array to prevent infinite loop

  // Function to manually retry setup
  const retrySetup = () => {
    console.log('useChartSetup: Manual retry requested');
    setError(null);
    setChartReady(false);
    setIsLoading(true);
    // Reset the Chart.js setup state to force a fresh attempt
    resetChartJSSetup();
    
    // Re-run the initialization
    const initializeChart = async () => {
      try {
        console.log('useChartSetup: Retry - calling setupChartJS...');
        await setupChartJS();
        
        if (isChartJSSetup()) {
          console.log('useChartSetup: Retry successful, marking as ready');
          setChartReady(true);
          setIsLoading(false);
        } else {
          console.error('useChartSetup: Retry failed - isChartJSSetup() returned false');
          setError('Chart setup failed');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('useChartSetup: Retry error:', err);
        setError(err instanceof Error ? err.message : 'Chart setup failed');
        setIsLoading(false);
      }
    };
    
    initializeChart();
  };

  return {
    chartReady,
    isLoading,
    error,
    retrySetup
  };
}
