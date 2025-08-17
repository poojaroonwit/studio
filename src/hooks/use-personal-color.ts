import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

export function usePersonalColor() {
  const { data: session, status } = useSession();
  const [personalColor, setPersonalColor] = useState<string>('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load personal color on mount
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setIsLoaded(true);
      return;
    }

    if (session?.user?.id) {
      loadPersonalColor();
    }
  }, [status, session?.user?.id]);

  const loadPersonalColor = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/personal-color', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPersonalColor(data.personalColor || '#3B82F6');
      } else {
        console.warn('Failed to load personal color, using default');
        setPersonalColor('#3B82F6');
      }
    } catch (error) {
      console.warn('Error loading personal color:', error);
      setPersonalColor('#3B82F6');
    } finally {
      setIsLoaded(true);
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const updatePersonalColor = useCallback(async (newColor: string) => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/personal-color', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personalColor: newColor }),
      });

      if (response.ok) {
        setPersonalColor(newColor);
        toast.success('Personal color updated successfully');
        return true;
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update personal color');
        return false;
      }
    } catch (error) {
      console.error('Error updating personal color:', error);
      toast.error('Failed to update personal color');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  return {
    personalColor,
    updatePersonalColor,
    isLoading,
    isLoaded,
    isAuthenticated: status === 'authenticated',
  };
}
