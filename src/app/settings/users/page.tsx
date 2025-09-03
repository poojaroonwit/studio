// src/app/settings/users/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button'; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, UsersRound, ShieldAlert, Edit3, Trash2, ServerCrash, Loader2, MoreHorizontal, KeyRound, Filter, Search, XCircle, Settings, Users, ShieldCheck, AlertTriangle } from "lucide-react";
import type { UserProfile, UserGroup, UserTeam } from '@/lib/types'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect, useCallback } from 'react'; 
import { UnifiedUserModal, type UnifiedUserFormValues, type ModalMode } from '@/components/users/UnifiedUserModal';
// Import the component statically instead of using dynamic require
import { UserGroupsTab } from '@/components/settings/UserGroupsTab';
import { UserTeamsTab } from '@/components/settings/UserTeamsTab';

import { useRouter, usePathname } from 'next/navigation'; 
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

const userRoleOptionsFilter: (UserProfile['role'] | "ALL_ROLES")[] = ['ALL_ROLES', 'Admin', 'Recruiters', 'Hiring Manager'];

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
          null
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
        {null}
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
        {null}
      </div>
    );
  }
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname(); 
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0); // Add refresh key for avatars

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


  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);



  const fetchUsers = useCallback(async (currentFilters: {name?: string, email?: string, role?: UserProfile['role'] | "ALL_ROLES", teamId?: string | "ALL_TEAMS"} = {}, currentPageParam?: number, currentPageSize?: number) => {
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
        const errorData = await response.json().catch(() => ({ message: response.statusText || `Status: ${response.status}` }));
        if (response.status === 401 || response.status === 403) {
             signIn(undefined, { callbackUrl: pathname });
             return;
        }
        setFetchError(errorData.message || 'Failed to fetch users');
        setUsers([]); 
        return;
      }
      const data = await response.json();
      
      // Handle both old array format and new paginated format
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
        setTotalCount(data.length);
        setCurrentPage(1);
        setPageSize(data.length);
      } else {
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
        setCurrentPage(data.pagination?.currentPage || 1);
        setPageSize(data.pagination?.pageSize || 10);
      }
      
      // Force avatar refresh when user list is updated
      setAvatarRefreshKey(prev => prev + 1);
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      if (!(errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("forbidden"))) {
        setFetchError(errorMessage);
      }
      setUsers([]); 
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, pathname, currentPage, pageSize]); 

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated') {
      // Check permission instead of role
      if (!hasPermission(session.user, 'USERS_VIEW')) {
        setFetchError("You do not have permission to manage users.");
        setIsLoading(false);
      } else {
        fetchUsers({name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter}, currentPage, pageSize);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session, pathname]); 

  useEffect(() => {
    if (fetchError) {
      toast.error(fetchError);
    }
  }, [fetchError]);

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    fetchUsers({name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter}, 1, pageSize);
  };

  // Fetch teams for filter
  useEffect(() => {
    const loadTeams = async () => {
      if (sessionStatus !== 'authenticated') return;
      try {
        const response = await fetch('/api/settings/user-teams');
        if (response.ok) {
          const data = await response.json();
          setTeams(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        // ignore
      }
    };
    loadTeams();
  }, [sessionStatus]);


  const handleAddUser = async (data: UnifiedUserFormValues) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          signIn(undefined, { callbackUrl: pathname });
          return;
        }
        throw new Error(result.message || 'Failed to add user');
      }
      fetchUsers({name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter}, currentPage, pageSize); 
      toast.success(`User ${result.name} added successfully.`);
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
      const result = await response.json();
      if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
          signIn(undefined, { callbackUrl: pathname });
          return;
        }
        throw new Error(result.message || 'Failed to update user');
      }
      // Update local users state to refresh related components without reloading the page
      const matchesCurrentFilters = (u: UserProfile) => {
        const nameOk = !nameFilter || (u.name || '').toLowerCase().includes(nameFilter.toLowerCase());
        const emailOk = !emailFilter || (u.email || '').toLowerCase().includes(emailFilter.toLowerCase());
        const roleOk = roleFilter === 'ALL_ROLES' || u.role === roleFilter;
        const teamOk = teamFilter === 'ALL_TEAMS' || ((u.teams || []).some((t: any) => t.id === teamFilter));
        return nameOk && emailOk && roleOk && teamOk;
      };
      setUsers(prev => {
        const updated = prev.map(u => u.id === result.id ? { ...u, ...result } : u);
        return matchesCurrentFilters(result) ? updated : updated.filter(u => u.id !== result.id);
      });
      // Force avatar refresh after user update
      setAvatarRefreshKey(prev => prev + 1);
      toast.success(`User ${result.name} updated successfully.`);
      handleModalClose();

      // If the current user is editing their own permissions, refresh the session
      if (session?.user?.id === userId) {
        // Force a session refresh to update permissions
        await updateSession();
        toast.success("Your session has been refreshed with the new permissions.");
      }
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
    // Force refresh of avatars when modal is closed
    setAvatarRefreshKey(prev => prev + 1);
  };

  const confirmDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: "Failed to delete user."}));
        if (response.status === 401 || response.status === 403) {
          signIn(undefined, { callbackUrl: pathname });
          return;
        }
        throw new Error(errorData.message || 'Failed to delete user');
      }
      fetchUsers({name: nameFilter, email: emailFilter, role: roleFilter}, currentPage, pageSize); 
      toast.success(`User ${userToDelete.name} deleted.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUserToDelete(null); 
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers({name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter}, page, pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    fetchUsers({name: nameFilter, email: emailFilter, role: roleFilter, teamId: teamFilter}, 1, newPageSize);
  };

  if (sessionStatus === 'loading' || (sessionStatus === 'unauthenticated' && !pathname.startsWith('/auth/signin')) || (isLoading && !fetchError && users.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError && !isLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Users</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {fetchError === "You do not have permission to view this page." ? (
            <Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Dashboard</Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, permissions, and teams</p>
          </div>
                     {(hasPermission(session?.user, 'USERS_CREATE')) && activeTab === 'users' && (
            <Button variant="default" onClick={() => openUserModal('create')}> 
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex w-full border-b border-border/50 mb-6">
          <div
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'users'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <UsersRound className="h-4 w-4" />
            Users
          </div>
          <div
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'teams'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Users className="h-4 w-4" />
            User Teams
          </div>
          <div
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
              activeTab === 'groups'
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Roles & Permissions
          </div>
        </div>
      </div>

      {/* Content with ScrollArea */}
      <ScrollArea className="flex-1 px-6 [&_.simplebar-scrollbar]:bg-muted-foreground/20 [&_.simplebar-scrollbar]:hover:bg-muted-foreground/40 [&_.simplebar-scrollbar]:w-2 [&_.simplebar-scrollbar]:rounded-full">
        <div className="space-y-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              {/* Filters Section */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="name-filter">Name</Label>
                    <Input id="name-filter" placeholder="Filter by name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} disabled={isLoading}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email-filter">Email</Label>
                    <Input id="email-filter" placeholder="Filter by email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} disabled={isLoading}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="role-filter">Role</Label>
                    <Select value={roleFilter || ''} onValueChange={(value) => setRoleFilter(value as UserProfile['role'] | "ALL_ROLES")} disabled={isLoading}>
                      <SelectTrigger id="role-filter"><SelectValue placeholder="Select role..." /></SelectTrigger>
                      <SelectContent>
                        {userRoleOptionsFilter.map(opt => <SelectItem key={opt} value={opt}>{opt === "ALL_ROLES" ? "All Roles" : opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="team-filter">Team</Label>
                    <Select value={teamFilter || ''} onValueChange={(value) => setTeamFilter(value as string | "ALL_TEAMS")} disabled={isLoading}>
                      <SelectTrigger id="team-filter"><SelectValue placeholder="Select team..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_TEAMS">All Teams</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleApplyFilters} disabled={isLoading} className="w-full sm:w-auto"><Search className="mr-2 h-4 w-4"/>Apply</Button>
                  </div>
                </div>
              </div>

              {isLoading && users.length === 0 && !fetchError ? (
                  <div className="text-center py-10">
                  <UsersRound className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
                  <p className="mt-4 text-muted-foreground">Loading users...</p>
                </div>
              ) : users.length === 0 && !fetchError ? ( 
                <div className="text-center py-10">
                  <UsersRound className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No users found matching your criteria.</p>
                                         {(hasPermission(session?.user, 'USERS_CREATE')) && (
                      <Button variant="default" className="mt-4" onClick={() => openUserModal('create')}> 
                        <PlusCircle className="mr-2 h-4 w-4" /> Add First User
                    </Button>
                    )}
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Teams</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <UserAvatarCompact 
                                user={user} 
                                size="md" 
                                forceRefresh={avatarRefreshKey > 0} // Pass refresh key
                              />
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                          <TableCell>
                            {(() => {
                              const displayRole = (user as any).userGroupName || user.role;
                              const isAdminBadge = displayRole === 'Admin';
                              return (
                                <Badge variant={isAdminBadge ? "default" : "secondary"} className={isAdminBadge ? 'bg-primary hover:bg-primary/90' : ''}>
                                  {displayRole}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.teams && user.teams.length > 0
                              ? user.teams.map(t => <Badge key={t.id} variant="outline" className="mr-1 mb-1">{t.name}</Badge>)
                              : <span className="text-xs text-muted-foreground">No teams</span>
                            }
                          </TableCell>
                                                     <TableCell className="text-right">
                             {(hasPermission(session?.user, 'USERS_EDIT') || hasPermission(session?.user, 'WARNING_CONFIGURATIONS_MANAGE')) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                                                     <DropdownMenuItem onClick={() => openUserModal('edit', user)}>
                                     <Edit3 className="mr-2 h-4 w-4" />
                                     Edit User
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => router.push(`/settings/users/${user.id}/warning-configurations`)}>
                                     <AlertTriangle className="mr-2 h-4 w-4" />
                                     Warning Configurations
                                   </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setUserToDelete(user)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      total={totalCount}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      pageSizeOptions={[5, 10, 20, 50]}
                      showPageSizeSelector={true}
                      className="mt-6"
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* User Teams Tab */}
          {activeTab === 'teams' && (
            <TabErrorBoundary>
              <SafeTeamsTab />
            </TabErrorBoundary>
          )}

          {/* Roles & Permissions Tab */}
          {activeTab === 'groups' && (
            <TabErrorBoundary>
              <SafeGroupsTab />
            </TabErrorBoundary>
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      <UnifiedUserModal
        isOpen={isUserModalOpen}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) {
            // Handle modal close (e.g., clicking outside, pressing escape)
            handleModalClose();
          } else {
            setIsUserModalOpen(isOpen);
          }
        }}
        mode={modalMode}
        user={selectedUser}
        onSave={selectedUser ? (data: UnifiedUserFormValues) => handleEditUser(selectedUser.id, data) : handleAddUser}
        onEditUser={handleEditUser}
        onAddUser={handleAddUser}
      />

      

      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if(!open) setUserToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user <strong>{userToDelete.name}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className={buttonVariants({ variant: "destructive" })}>
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
    
