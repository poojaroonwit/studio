"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { UserTeam } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, Save, Loader2, ServerCrash, Users, UserPlus, Search, X, MoreHorizontal } from 'lucide-react';
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

export default function UserTeamsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
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
      if (session.user.role !== 'Admin' &&  !session.user.modulePermissions?.includes('USERS_MANAGE')) {
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

  // Fetch showLogoOnly setting
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchShowLogoOnly = async () => {
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
          }
        } catch (error) {
          console.error('Error fetching showLogoOnly setting:', error);
        }
      };
      fetchShowLogoOnly();
    }
  }, [sessionStatus]);

  const handleSelectTeam = (team: UserTeam) => {
    setSelectedTeam(team);
    setIsTeamDrawerOpen(true);
    setActiveTab('details');
    loadTeamMembers(team.id);
    
    // Populate the form with team data
    form.reset({
      name: team.name,
      description: team.description || '',
      color: team.color || '#3B82F6',
      isActive: team.isActive
    });
  };

  const handleOpenModal = (team: UserTeam | null = null) => {
    if (team) {
      // For editing existing team, open the drawer
      setSelectedTeam(team);
      setEditingTeam(team);
      setIsTeamDrawerOpen(true);
      setActiveTab('details');
      loadTeamMembers(team.id);
      
      // Populate the form with team data
      form.reset({
        name: team.name,
        description: team.description || '',
        color: team.color || '#3B82F6',
        isActive: team.isActive
      });
    } else {
      // For creating new team, open the modal
      setEditingTeam(null);
      form.reset({
        name: '',
        description: '',
        color: '#3B82F6',
        isActive: true
      });
      setIsModalOpen(true);
    }
  };

  const handleTeamFormSubmit = async (data: TeamFormValues) => {
    // Determine if we're editing (drawer is open with selectedTeam) or creating (modal is open)
    const isEditing = selectedTeam && isTeamDrawerOpen;
    const url = isEditing ? `/api/settings/user-teams/${selectedTeam.id}` : '/api/settings/user-teams';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} team`);
      
      toast.success(`Team "${result.name}" was successfully ${isEditing ? 'updated' : 'created'}.`);
      
      // Close the appropriate modal/drawer
      if (isEditing) {
        setIsTeamDrawerOpen(false);
        setSelectedTeam(null);
        setEditingTeam(null);
      } else {
        setIsModalOpen(false);
      }
      
      fetchTeams(); // Refresh list

    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const confirmDelete = (team: UserTeam) => {
    setTeamToDelete(team);
  };

  const handleDelete = async () => {
    if (!teamToDelete) {
      setTeamToDelete(null);
      return;
    }
    try {
      const response = await fetch(`/api/settings/user-teams/${teamToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete team');
      }
      toast.success('Team deleted successfully.');
      fetchTeams(); // Refresh list
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setTeamToDelete(null);
    }
  };

  const handleAddUser = async () => {
    if (!selectedTeam || !selectedUserId) return;
    
    setIsAddingUser(true);
    try {
      const response = await fetch(`/api/settings/user-teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add user to team');
      }
      
      toast.success('User added to team successfully.');
      setIsAddUserModalOpen(false);
      setSelectedUserId('');
      loadTeamMembers(selectedTeam.id);
      loadAvailableUsers();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedTeam) return;
    
    setIsRemovingUser(userId);
    try {
      const response = await fetch(`/api/settings/user-teams/${selectedTeam.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove user from team');
      }
      
      toast.success('User removed from team successfully.');
      loadTeamMembers(selectedTeam.id);
      loadAvailableUsers();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsRemovingUser(null);
    }
  };

  // Load available users when add user modal opens
  useEffect(() => {
    if (isAddUserModalOpen && selectedTeam) {
      loadAvailableUsers();
    }
  }, [isAddUserModalOpen, selectedTeam]);

  if (sessionStatus === 'loading' || (isLoading && !fetchError && teams.length === 0 && !selectedTeam)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (fetchError && !isLoading) {
    const isPermissionError = fetchError === "You do not have permission to manage user teams.";
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Data</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {isPermissionError ? (
          <Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">
            Go to Dashboard
          </Button>
        ) : (
          <Button onClick={() => fetchTeams()} className="btn-hover-primary-gradient">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">User Teams</h1>
          )}
          <p className="text-muted-foreground">Manage groups of users for collaboration and organization</p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="default">
          <PlusCircle className="mr-2 h-4 w-4" /> Create Team
        </Button>
      </div>

      {/* Full Width Table */}
      <div className="flex-1 bg-card border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading teams...</p>
                </TableCell>
              </TableRow>
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No teams defined.</p>
                  <Button onClick={() => handleOpenModal()} variant="default">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create First Team
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow 
                  key={team.id} 
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedTeam?.id === team.id && "bg-primary/5"
                  )}
                  onClick={() => handleSelectTeam(team)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
                      <span className="font-medium">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {team.description || 'No description'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {team.isActive ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {team.member_count || 0} members
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(team.createdAt || '').toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={e => { e.stopPropagation(); handleSelectTeam(team); }}
                        title="Edit team"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit team</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleSelectTeam(team); }}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleSelectTeam(team); }}>
                            <Users className="mr-2 h-4 w-4" /> Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); confirmDelete(team); }} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Team Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? `Update the details for the "${editingTeam.name}" team.` : 'Create a new team to organize users.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form as any}>
            <form onSubmit={form.handleSubmit(handleTeamFormSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="color" 
                        {...field} 
                        className="w-16 h-10 p-1"
                        value={field.value || '#3B82F6'}
                      />
                      <Input {...field} placeholder="#3B82F6" value={field.value ?? ''} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this team
                    </div>
                  </div>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{field.value ? 'Active' : 'Inactive'}</span>
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting} 
              variant="default"
              className="flex items-center gap-2"
              onClick={form.handleSubmit(handleTeamFormSubmit)}
            >
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingTeam ? 'Save Changes' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {teamToDelete && (
        <AlertDialog open={!!teamToDelete} onOpenChange={(open) => { if(!open) setTeamToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the team "<strong>{teamToDelete.name}</strong>". This action cannot be undone.
                All team members will be removed from this team.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTeamToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
                Delete Team
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Team Management Drawer */}
      {selectedTeam && (
        <Sheet open={isTeamDrawerOpen} onOpenChange={setIsTeamDrawerOpen}>
          <SheetContent className="w-[1200px] sm:w-[1100px]">
            <SheetHeader>
              <SheetTitle className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedTeam.color || '#3B82F6' }}
                />
                <span>{selectedTeam.name}</span>
              </SheetTitle>
              <SheetDescription>
                {selectedTeam.description || 'No description'}
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6">
              <div className="flex w-full border-b border-border/50">
                <div
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                    activeTab === 'details'
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Edit3 className="h-4 w-4" />
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
                  Members
                </div>
              </div>
                
                {activeTab === 'details' && (
                  <div className="mt-6 space-y-4">
                    <Form {...form as any}>
                      <form onSubmit={form.handleSubmit(handleTeamFormSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Name *</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="color" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Color</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-16 h-10 p-1"
                                  value={field.value || '#3B82F6'}
                                />
                                <Input {...field} placeholder="#3B82F6" value={field.value ?? ''} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="isActive" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active Status</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Enable or disable this team
                              </div>
                            </div>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <span className="text-sm">{field.value ? 'Active' : 'Inactive'}</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )} />
                        
                        <div className="flex items-center justify-end space-x-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsTeamDrawerOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={form.formState.isSubmitting} 
                            variant="default"
                            className="flex items-center gap-2"
                          >
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
                
                {activeTab === 'members' && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Team Members</h3>
                      <Button 
                        onClick={() => setIsAddUserModalOpen(true)} 
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Member
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[300px] border rounded-md p-4">
                      {isLoadingMembers ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : members.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Users className="h-8 w-8 mx-auto mb-2" />
                          <p>No members in this team</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">{member.role}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveUser(member.id)}
                                  disabled={isRemovingUser === member.id}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  {isRemovingUser === member.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            
          </SheetContent>
        </Sheet>
      )}

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member to Team</DialogTitle>
            <DialogDescription>
              Select a user to add to the "{selectedTeam?.name}" team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Users</label>
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {isLoadingAvailable ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No available users found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-muted/50",
                        selectedUserId === user.id && "bg-primary/10"
                      )}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{user.role}</Badge>
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
              onClick={handleAddUser}
              disabled={!selectedUserId || isAddingUser}
              className="flex items-center gap-2"
            >
              {isAddingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
