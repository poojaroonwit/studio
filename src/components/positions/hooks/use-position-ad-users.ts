import { useCallback, useEffect, useState } from 'react';
import { getJsonArray, getJsonString, isJsonObject, readJsonObject } from '../../../lib/response-json';
import type { AzureAdPositionUser } from '../PositionMicrosoftAdTab';

interface UsePositionAdUsersInput {
  enabled: boolean;
  positionTitle?: string | null;
}

function normalizeAzureAdPositionUsers(value: unknown): AzureAdPositionUser[] {
  const users = Array.isArray(value) ? value : [];

  return users.flatMap((user) => {
    if (!isJsonObject(user)) return [];

    const id = getJsonString(user, 'id');
    if (!id) return [];

    return [{
      id,
      displayName: getJsonString(user, 'displayName') ?? null,
      jobTitle: getJsonString(user, 'jobTitle') ?? null,
      department: getJsonString(user, 'department') ?? null,
      mail: getJsonString(user, 'mail') ?? null,
    }];
  });
}

export function usePositionAdUsers({ enabled, positionTitle }: UsePositionAdUsersInput) {
  const [users, setUsers] = useState<AzureAdPositionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdUsers = useCallback(async () => {
    if (!positionTitle) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/azure-ad/users/by-job-title?jobTitle=${encodeURIComponent(positionTitle)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch AD users');
      }

      const data = await readJsonObject(response);
      const errorMessage = getJsonString(data, 'error');

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      setUsers(normalizeAzureAdPositionUsers(getJsonArray(data, 'users')));
    } catch (requestError) {
      console.error('Error fetching AD users:', requestError);
      setError(requestError instanceof Error ? requestError.message : 'Failed to fetch AD users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [positionTitle]);

  useEffect(() => {
    if (enabled && positionTitle) {
      fetchAdUsers();
    }
  }, [enabled, positionTitle, fetchAdUsers]);

  return {
    adUsers: users,
    adUsersError: error,
    fetchAdUsers,
    isLoadingAdUsers: isLoading,
  };
}
