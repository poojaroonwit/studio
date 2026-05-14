// src/app/settings/users/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, UsersRound, ShieldAlert, Edit3, Trash2, ServerCrash, Loader2, MoreHorizontal, KeyRound, Filter, Search, XCircle, Settings, Users, ShieldCheck, AlertTriangle, ListOrdered, Clock, RefreshCw, ChevronDown, CheckCircle2, ChevronLeft } from "lucide-react";
import type { UserProfile, UserGroup, UserTeam } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedUserModal, type UnifiedUserFormValues, type ModalMode } from '@/components/users/UnifiedUserModal';
import { UserActivityLogsDrawer } from '@/components/users/UserActivityLogsDrawer';
// Import the component statically instead of using dynamic require
import { UserGroupsTab } from '@/components/settings/UserGroupsTab';
import { UserTeamsTab } from '@/components/settings/UserTeamsTab';

import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { signIn, useSession } from "next-auth/react";
import { toast } from 'react-hot-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { hasPermission } from '@/lib/permissions';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';

// Error boundary component for tab content
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tab Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <ServerCrash className="w-16 h-16 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
          <p className="text-muted-foreground mb-4">There was an error loading this tab content.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe component wrapper to prevent hook order issues
function SafeTeamsTab() {
  try {
    return <UserTeamsTab />;
  } catch (error) {
    console.error('Failed to load UserTeamsTab:', error);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Teams</h3>
        <p className="text-muted-foreground mb-4">Failed to load teams component</p>
      </div>
    );
  }
}

function SafeGroupsTab() {
  try {
    return <UserGroupsTab />;
  } catch (error) {
    console.error('Failed to load UserGroupsTab:', error);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Roles</h3>
        <p className="text-muted-foreground mb-4">Failed to load groups component</p>
      </div>
    );
  }
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/settings/users';
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserProfile['role'] | "ALL_ROLES">("ALL_ROLES");
  const [teamFilter, setTeamFilter] = useState<string | "ALL_TEAMS">("ALL_TEAMS");
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isActivityLogsDrawerOpen, setIsActivityLogsDrawerOpen] = useState(false);
  const [userForActivityLogs, setUserForActivityLogs] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'none' | 'page' | 'allFiltered' | 'all'>('none');
  const [isLoadingSelection, setIsLoadingSelection] = useState(false);

  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const allOnPage = new Set(selectedUserIds);
      users.forEach(user => allOnPage.add(user.id));
      setSelectedUserIds(allOnPage);
      setSelectionMode('page');
    } else {
      const remaining = new Set(selectedUserIds);
      users.forEach(user => remaining.delete(user.id));
      setSelectedUserIds(remaining);
      setSelectionMode(remaining.size > 0 ? 'page' : 'none');
    }
  };

  const handleSelectAllFiltered = async () => {
    setIsLoadingSelection(true);
    try {
      const queryParams = new URLSearchParams();
      if (nameFilter) queryParams.append('name', nameFilter);
      if (emailFilter) queryParams.append('email', emailFilter);
      if (roleFilter && roleFilter !== "ALL_ROLES") queryParams.append('role', roleFilter);
      if (teamFilter && teamFilter !== "ALL_TEAMS") queryParams.append('teamId', teamFilter);
      queryParams.append('idsOnly', 'true');

      const response = await fetch(`/api/users?${queryParams}`);
      if (response.ok) {
        const { ids } = await response.json();
        setSelectedUserIds(new Set(ids));
        setSelectionMode('allFiltered');
        toast.success(`Selected ${ids.length} users matching filter`);
      }
    } catch (error) {
      toast.error('Failed to select users');
    } finally {
      setIsLoadingSelection(false);
    }
  };

  const handleSelectAllUsers = async () => {
    setIsLoadingSelection(true);
    try {
      const response = await fetch('/api/users?idsOnly=true');
      if (response.ok) {
        const { ids } = await response.json();
        setSelectedUserIds(new Set(ids));
        setSelectionMode('all');
        toast.success(`Selected all ${ids.length} users`);
      }
    } catch (error) {
      toast.error('Failed to select users');
    } finally {
      setIsLoadingSelection(false);
    }
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
    setSelectionMode('none');
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
    setSelectionMode(newSelected.size > 0 ? 'page' : 'none');
  };

  const isAllSelectedOnPage = users.length > 0 && users.every(u => selectedUserIds.has(u.id));
  const isSomeSelectedOnPage = users.some(u => selectedUserIds.has(u.id)) && !isAllSelectedOnPage;

  const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate' | 'changeRole', data?: any) => {
    if (selectedUserIds.size === 0) return;
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedUserIds.size} users? This cannot be undone.`)) return;
    }

    setIsProcessingBulk(true);
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds), action, data }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Bulk action failed');

      toast.success(result.message);
      setSelectedUserIds(new Set());
      fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, currentPage, pageSize);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const fetchUsers = useCallback(async (currentFilters: any = {}, currentPageParam?: number, currentPageSize?: number) => {
    if (sessionStatus !== 'authenticated') return;
    setIsLoading(true);
    setFetchError(null);

    const pageToUse = currentPageParam ?? currentPage;
    const pageSizeToUse = currentPageSize ?? pageSize;

    const queryParams = new URLSearchParams();
    if (currentFilters.name) queryParams.append('name', currentFilters.name);
    if (currentFilters.email) queryParams.append('email', currentFilters.email);
    if (currentFilters.role && currentFilters.role !== "ALL_ROLES") queryParams.append('role', currentFilters.role);
    if (currentFilters.teamId && currentFilters.teamId !== "ALL_TEAMS") queryParams.append('teamId', currentFilters.teamId);
    queryParams.append('page', pageToUse.toString());
    queryParams.append('pageSize', pageSizeToUse.toString());

    try {
      const response = await fetch(`/api/users?${queryParams.toString()}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          signIn(undefined, { callbackUrl: currentPath });
          return;
        }
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        setFetchError(errorData.message || 'Failed to fetch users');
        setUsers([]);
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
        setTotalCount(data.length);
      } else {
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      }
      setAvatarRefreshKey(prev => prev + 1);
    } catch (error) {
      setFetchError((error as Error).message);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, currentPath, currentPage, pageSize]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: currentPath });
    } else if (sessionStatus === 'authenticated') {
      if (!hasPermission(session.user, 'USERS_VIEW')) {
        router.push('/unauthorized');
        setIsLoading(false);
      } else {
        fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, currentPage, pageSize);
      }
    }
  }, [sessionStatus, session, currentPath]);

  useEffect(() => {
    if (fetchError) toast.error(fetchError);
  }, [fetchError]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, 1, pageSize);
  };

  useEffect(() => {
    const loadFilters = async () => {
      if (sessionStatus !== 'authenticated') return;
      try {
        const teamsResponse = await fetch('/api/settings/user-teams');
        if (teamsResponse.ok) setTeams(await teamsResponse.json());

        const rolesResponse = await fetch('/api/settings/user-groups');
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setRoles(rolesData.map((r: any) => ({ id: r.id, name: r.name })));
        }
      } catch (e) {
        console.error('Error loading filter options:', e);
      }
    };
    loadFilters();
  }, [sessionStatus]);

  const handleAddUser = async (data: UnifiedUserFormValues) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add user');
      fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, currentPage, pageSize);
      toast.success(`User added successfully.`);
      handleModalClose();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleEditUser = async (userId: string, data: UnifiedUserFormValues) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      const result = await response.json();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...result } : u));
      setAvatarRefreshKey(prev => prev + 1);
      toast.success(`User updated successfully.`);
      handleModalClose();
      if (session?.user?.id === userId) await updateSession();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const openUserModal = (mode: ModalMode, user?: UserProfile) => {
    setModalMode(mode);
    setSelectedUser(user || null);
    setIsUserModalOpen(true);
  };

  const handleModalClose = () => {
    setIsUserModalOpen(false);
    setSelectedUser(null);
  };

  const confirmDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter }, currentPage, pageSize);
      toast.success(`User deleted.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUserToDelete(null);
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    try {
      const newStatus = user.isActive !== false ? false : true;
      const response = await fetch(`/api/users/${user.id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
      toast.success(`User ${newStatus ? 'enabled' : 'disabled'} successfully.`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleSyncFromAD = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Syncing with Azure AD...');
    try {
      const response = await fetch('/api/users/sync-ad', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      toast.success('Sync completed successfully', { id: toastId });
      fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, currentPage, pageSize);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastLogin = (lastLogin: string | null | undefined) => {
    if (!lastLogin) return 'Never';
    try {
      return format(parseISO(lastLogin), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const isManager = hasPermission(session?.user, 'USERS_VIEW');

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, page, pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchUsers({ name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter }, 1, newPageSize);
  };

  if (sessionStatus === 'loading' || (isLoading && users.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} className="h-9 w-9 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
              <p className="text-muted-foreground">Manage users, roles, and teams</p>
            </div>
          </div>
          {(hasPermission(session?.user, 'USERS_CREATE')) && activeTab === 'users' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSyncFromAD} disabled={isSyncing}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                Sync from Azure AD
              </Button>
              <Button variant="default" onClick={() => openUserModal('create')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New User
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex w-full border-b-2 border-zinc-200 dark:border-zinc-800 mb-4 gap-6">
          <div
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-1 h-12 text-sm font-medium transition-all duration-200 relative cursor-pointer border-b-2 -mb-[2px]",
              activeTab === 'users'
                ? "text-foreground border-foreground z-10"
                : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/50"
            )}
          >
            <UsersRound className="h-4 w-4" /> Users
          </div>
          <div
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex items-center gap-2 px-1 h-12 text-sm font-medium transition-all duration-200 relative cursor-pointer border-b-2 -mb-[2px]",
              activeTab === 'teams'
                ? "text-foreground border-foreground z-10"
                : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/50"
            )}
          >
            <Users className="h-4 w-4" /> User Teams
          </div>
          <div
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex items-center gap-2 px-1 h-12 text-sm font-medium transition-all duration-200 relative cursor-pointer border-b-2 -mb-[2px]",
              activeTab === 'groups'
                ? "text-foreground border-foreground z-10"
                : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/50"
            )}
          >
            <ShieldCheck className="h-4 w-4" /> Roles & Permissions
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-4">
          {activeTab === 'users' && (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input placeholder="Filter by name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input placeholder="Filter by email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_ROLES">All Roles</SelectItem>
                      {roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Team</Label>
                  <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v)}>
                    <SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_TEAMS">All Teams</SelectItem>
                      {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleApplyFilters}><Search className="mr-2 h-4 w-4" /> Apply</Button>
              </div>

              {/* Table */}
              {users.length === 0 ? (
                <div className="text-center py-10">
                  <UsersRound className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No users found.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px] px-2">
                          <Checkbox checked={isAllSelectedOnPage} onCheckedChange={handleSelectAllOnPage} />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Teams</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="px-2">
                            <Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={(c) => handleSelectUser(user.id, c as boolean)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <UserAvatarCompact user={user} size="md" />
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell><Badge variant="secondary">{(user as any).userGroupName || user.role}</Badge></TableCell>
                          <TableCell>
                            {user.teams?.map(t => <Badge key={t.id} variant="outline" className="mr-1">{t.name}</Badge>)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive !== false ? "default" : "destructive"}>
                              {user.isActive !== false ? "Active" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openUserModal('edit', user)}><Edit3 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}><ShieldAlert className="mr-2 h-4 w-4" /> Toggle Status</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmDeleteUser(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {activeTab === 'teams' && <SafeTeamsTab />}
          {activeTab === 'groups' && <SafeGroupsTab />}
        </div>
      </ScrollArea>

      <UnifiedUserModal
        isOpen={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        mode={modalMode}
        user={selectedUser}
        onSave={selectedUser ? (data) => handleEditUser(selectedUser.id, data) : handleAddUser}
        onEditUser={handleEditUser}
        onAddUser={handleAddUser}
      />

      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete {userToDelete.name}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
