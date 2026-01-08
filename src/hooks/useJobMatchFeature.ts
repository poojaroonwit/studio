import { useState, useEffect } from 'react';

export const useJobMatchFeature = () => {
  const [isJobMatchEnabled, setIsJobMatchEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkJobMatchFeature = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          let settings: any = {};
          
          if (data.settings && Array.isArray(data.settings)) {
            settings = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
          } else {
            settings = data;
          }
          
          // Default to true if not set, but allow explicit false
          const jobMatchEnabled = settings.jobMatchFeatureEnabled !== 'false';
          setIsJobMatchEnabled(jobMatchEnabled);
        }
      } catch (error) {
        console.error('Error checking job match feature status:', error);
        // Default to enabled on error
        setIsJobMatchEnabled(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkJobMatchFeature();
  }, []);

  return { isJobMatchEnabled, isLoading };
};
