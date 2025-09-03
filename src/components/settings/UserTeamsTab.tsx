"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { UserTeam } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, Save, Loader2, ServerCrash, Users, UserPlus, Search, X, MoreHorizontal, Settings2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { hasAnyPermission } from '@/lib/permissions';

const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});
type TeamFormValues = z.infer<typeof teamFormSchema>;

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function UserTeamsTab() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<UserTeam | null>(null);
  const [isTeamDrawerOpen, setIsTeamDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<UserTeam | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<UserTeam | null>(null);

  // Team members management
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: { name: '', description: '', color: '#3B82F6', isActive: true },
  });

  const fetchTeams = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/user-teams');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch teams' }));
        if (response.status === 401 || response.status === 403) {
          signIn(undefined, { callbackUrl: pathname });
          return;
        }
        throw new Error(errorData.message);
      }
      const data: UserTeam[] = await response.json();
      setTeams(data);
    } catch (error) {
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, pathname]);

  // Team members management functions
  const loadTeamMembers = async (teamId: string) => {
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`/api/settings/user-teams/${teamId}/members`);
      if (!response.ok) {
        throw new Error('Failed to load team members');
      }
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!selectedTeam) return;
    
    setIsLoadingAvailable(true);
    try {
      const url = new URL(`/api/settings/user-teams/${selectedTeam.id}/available-users`, window.location.origin);
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated' && session) {
      if (session.user.role !== 'Admin' &&  !hasAnyPermission(session.user, ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE'])) {
        setFetchError("You do not have permission to manage user teams.");
        setIsLoading(false);
      } else {
        fetchTeams();
      }
    }
  }, [sessionStatus, session, pathname, fetchTeams]);

  useEffect(() => {
    if (fetchError) {
      toast.error(fetchError);
    }
  }, [fetchError]);

  const handleSelectTeam = (team: UserTeam) => {
    setSelectedTeam(team);
    setIsTeamDrawerOpen(true);
    setActiveTab('details');
    loadTeamMembers(team.id);
    
    // Populate the form with team data
    const formData = {
      name: team.name,
      description: team.description || '',
      color: team.color || '#3B82F6',
      isActive: team.isActive ?? true
    };
    console.log('Setting form data for editing:', { team, formData });
    form.reset(formData);
  };

  const handleOpenModal = (team: UserTeam | null = null) => {
    setEditingTeam(team);
    form.reset(team ? { name: team.name, description: team.description || '', color: team.color || '#3B82F6', isActive: team.isActive ?? true } : { name: '', description: '', color: '#3B82F6', isActive: true });
    setIsModalOpen(true);
  };

  const handleTeamFormSubmit = async (data: TeamFormValues) => {
    // Check if we're editing (either in modal with editingTeam or in drawer with selectedTeam)
    const isEditing = editingTeam || selectedTeam;
    const teamId = editingTeam?.id || selectedTeam?.id;
    const url = isEditing ? `/api/settings/user-teams/${teamId}` : '/api/settings/user-teams';
    const method = isEditing ? 'PUT' : 'POST';

    console.log('Form submission:', { isEditing, teamId, url, method, data });

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log('API response:', { status: response.status, result });
      
      if (!response.ok) throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} team`);
      
      toast.success(`Team "${result.name}" was successfully ${isEditing ? 'updated' : 'created'}.`);
      
      // Close the appropriate modal/drawer
      if (editingTeam) {
        setIsModalOpen(false);
      } else if (selectedTeam) {
        setIsTeamDrawerOpen(false);
        setSelectedTeam(null);
      }
      
      fetchTeams(); // Refresh list

    } catch (error) {
      console.error('Form submission error:', error);
      toast.error((error as Error).message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      const response = await fetch(`/api/settings/user-teams/${teamToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete team' }));
        throw new Error(errorData.message);
      }
      toast.success(`Team "${teamToDelete.name}" was successfully deleted.`);
      setTeamToDelete(null);
      fetchTeams(); // Refresh list
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleAddUserToTeam = async () => {
    if (!selectedUserId || !selectedTeam) return;
    
    setIsAddingUser(true);
    try {
      const response = await fetch(`/api/settings/user-teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add user to team');
      }
      
      toast.success('User added to team successfully');
      setSelectedUserId('');
      setIsAddUserModalOpen(false);
      loadTeamMembers(selectedTeam.id);
      loadAvailableUsers();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUserFromTeam = async (userId: string) => {
    if (!selectedTeam) return;
    
    setIsRemovingUser(userId);
    try {
      const response = await fetch(`/api/settings/user-teams/${selectedTeam.id}/members/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove user from team');
      }
      
      toast.success('User removed from team successfully');
      loadTeamMembers(selectedTeam.id);
      loadAvailableUsers();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsRemovingUser(null);
    }
  };

  if (isLoading) {
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
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Teams</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">User Teams</h2>
          <p className="text-muted-foreground">Manage teams and team assignments</p>
        </div>
        {hasAnyPermission(session?.user, ['USERS_CREATE']) && (
          <Button onClick={() => handleOpenModal()} className="btn-hover-primary-gradient">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        )}
      </div>

             {/* Teams List */}
       <div className="border rounded-lg overflow-hidden">
         {teams.length === 0 ? (
           <div className="text-center py-8">
             <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold text-foreground mb-2">No Teams Found</h3>
             <p className="text-muted-foreground mb-4">Create your first team to get started</p>
             {hasAnyPermission(session?.user, ['USERS_CREATE']) && (
               <Button onClick={() => handleOpenModal()} className="btn-hover-primary-gradient">
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Create First Team
               </Button>
             )}
           </div>
         ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Team Name</TableHead>
                 <TableHead>Description</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Members</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {teams.map((team) => (
                 <TableRow key={team.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectTeam(team)}>
                   <TableCell>
                     <div className="flex items-center gap-3">
                       <div 
                         className="w-3 h-3 rounded-full" 
                         style={{ backgroundColor: team.color || '#3B82F6' }}
                       />
                       <span className="font-medium">{team.name}</span>
                     </div>
                   </TableCell>
                   <TableCell>
                     <span className="text-muted-foreground">
                       {team.description || 'No description'}
                     </span>
                   </TableCell>
                   <TableCell>
                     <Badge variant={team.isActive ? "default" : "secondary"}>
                       {team.isActive ? "Active" : "Inactive"}
                     </Badge>
                   </TableCell>
                   <TableCell>
                                           <span className="text-sm text-muted-foreground">
                        {team.member_count || 0} members
                      </span>
                   </TableCell>
                   <TableCell className="text-right">
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       className="h-8 px-3"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleSelectTeam(team);
                       }}
                     >
                       Manage
                     </Button>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         )}
       </div>

      {/* Team Management Drawer */}
      {selectedTeam && (
        <Sheet open={isTeamDrawerOpen} onOpenChange={setIsTeamDrawerOpen}>
          <SheetContent side="right" className="w-[600px] sm:w-[700px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedTeam.color || '#3B82F6' }}
                />
                {selectedTeam.name}
              </SheetTitle>
              <SheetDescription>
                Manage team details and members
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col h-full mt-6">
              {/* Tab Navigation */}
              <div className="flex border-b border-border/50 mb-6">
                <div
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'details'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Settings2 className="h-4 w-4" />
                  Details
                </div>
                <div
                  onClick={() => setActiveTab('members')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'members'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Members ({members.length})
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'details' && (
                  <ScrollArea className="flex-1">
                    <Form {...form}>
                      <form onSubmit={(e) => {
                        console.log('Form submit event triggered');
                        console.log('Form values:', form.getValues());
                        console.log('Form errors:', form.formState.errors);
                        form.handleSubmit(handleTeamFormSubmit)(e);
                      }} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Team Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter team name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ''} placeholder="Enter team description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Team Color</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value ?? '#3B82F6'} type="color" className="w-20 h-10" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                                                 <FormField
                           control={form.control}
                           name="isActive"
                           render={({ field }) => (
                             <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                               <div className="space-y-0.5">
                                 <FormLabel className="text-base">Active Status</FormLabel>
                                 <div className="text-sm text-muted-foreground">
                                   Enable or disable this team
                                 </div>
                               </div>
                               <FormControl>
                                 <Switch
                                   checked={field.value}
                                   onCheckedChange={field.onChange}
                                 />
                               </FormControl>
                             </FormItem>
                           )}
                         />

                        <div className="flex gap-2 pt-4">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={() => setTeamToDelete(selectedTeam)}
                            className="flex-1"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Team
                          </Button>
                          <Button type="submit" className="flex-1">
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              const formData = form.getValues();
                              console.log('Manual update test:', formData);
                              handleTeamFormSubmit(formData);
                            }}
                            className="flex-1"
                          >
                            Test Update
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </ScrollArea>
                )}

                {activeTab === 'members' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Team Members</h3>
                      <Button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        size="sm"
                        className="btn-hover-primary-gradient"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </div>

                    <ScrollArea className="flex-1">
                      {isLoadingMembers ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : members.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No members in this team</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 rounded-full">
                                  <AvatarFallback className="rounded-full">{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUserFromTeam(member.id)}
                                disabled={isRemovingUser === member.id}
                                className="text-destructive hover:text-destructive"
                              >
                                {isRemovingUser === member.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Create/Edit Team Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Update team information' : 'Create a new team for organizing users'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTeamFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter team name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} placeholder="Enter team description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Color</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? '#3B82F6'} type="color" className="w-20 h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Member to Team</DialogTitle>
            <DialogDescription>
              Select a user to add to {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-search">Search Users</Label>
              <Input
                id="user-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyUp={() => loadAvailableUsers()}
              />
            </div>

            <ScrollArea className="h-64">
              {isLoadingAvailable ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No available users found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-full">
                          <AvatarFallback className="rounded-full">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      {selectedUserId === user.id && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUserToTeam}
              disabled={!selectedUserId || isAddingUser}
            >
              {isAddingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Team'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => { if(!open) setTeamToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team <strong>{teamToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeamToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className={buttonVariants({ variant: "destructive" })}>
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
