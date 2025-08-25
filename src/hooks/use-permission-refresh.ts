import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function usePermissionRefresh() {
  const { data: session, update } = useSession();

  const refreshPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the session with fresh permissions
        await update({
          ...session,
          user: {
            ...session?.user,
            modulePermissions: data.permissions,
          },
        });

        return { success: true, permissions: data.permissions };
      } else {
        const errorData = await response.json();
        console.error('Failed to refresh permissions:', errorData);
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
      return { success: false, error: 'Network error' };
    }
  }, [session, update]);

  return { refreshPermissions };
}
