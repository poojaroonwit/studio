import { useState, useEffect } from 'react';

export const useInterviewInvitationFeature = () => {
  const [isInterviewInvitationEnabled, setIsInterviewInvitationEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkInterviewInvitationFeature = async () => {
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
          const interviewInvitationEnabled = settings.interviewInvitationFeatureEnabled !== 'false';
          setIsInterviewInvitationEnabled(interviewInvitationEnabled);
        }
      } catch (error) {
        console.error('Error checking interview invitation feature status:', error);
        // Default to enabled on error
        setIsInterviewInvitationEnabled(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkInterviewInvitationFeature();
  }, []);

  return { isInterviewInvitationEnabled, isLoading };
};

