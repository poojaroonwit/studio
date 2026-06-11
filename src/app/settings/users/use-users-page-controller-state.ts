"use client";

import { useState } from 'react';

import type { UserProfile } from '@/lib/types';
import type { UsersSettingsTabId } from './UsersPageParts';
import type { UsersPageRoleFilter } from './users-page-utils';

export function useUsersPageControllerState() {
  const [activeTab, setActiveTab] = useState<UsersSettingsTabId>('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<UsersPageRoleFilter>('ALL_ROLES');
  const [teamFilter, setTeamFilter] = useState<string | 'ALL_TEAMS'>('ALL_TEAMS');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  return {
    activeTab,
    currentPage,
    emailFilter,
    fetchError,
    isLoading,
    isSyncing,
    nameFilter,
    roleFilter,
    setActiveTab,
    setCurrentPage,
    setEmailFilter,
    setFetchError,
    setIsLoading,
    setIsSyncing,
    setNameFilter,
    setRoleFilter,
    setTeamFilter,
    setUsers,
    setUserToDelete,
    teamFilter,
    users,
    userToDelete,
  };
}
