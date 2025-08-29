"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Loader2, 
  Mail,
  Calendar,
  Check,
  ShieldCheck,
  Settings2,
  Save,
  Edit3
} from 'lucide-react';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES } from '@/lib/types';
import { RolePermissionSelector } from './RolePermissionSelector';
import { cn } from '@/lib/utils';
import { useSafeEffect, useInfiniteLoopPrevention } from '@/hooks/use-safe-effect';

// Form schema for role editing
const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().optional().nullable(),
  is_default: z.boolean().optional().default(false),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface GroupMember {
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

interface UnifiedRoleDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserGroup | null;
  onRoleChange?: () => void;
  onMembersChange?: () => void;
}

export function UnifiedRoleDrawer({ 
  isOpen, 
  onOpenChange, 
  role, 
  onRoleChange,
  onMembersChange 
}: UnifiedRoleDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<PlatformModuleId[]>([]);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  // Refs for debouncing and request cancellation
  const permissionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPermissionUpdateRef = useRef<string>('');

  // Infinite loop prevention hooks
  const { trackRun: trackPermissionUpdate } = useInfiniteLoopPrevention('UnifiedRoleDrawer_permissionUpdate', 50, () => {
    console.error('🚨 Excessive permission updates detected in UnifiedRoleDrawer');
    toast.error('Too many permission updates. Please wait a moment before trying again.');
  });

  const { trackRun: trackRoleLoad } = useInfiniteLoopPrevention('UnifiedRoleDrawer_roleLoad', 20, () => {
    console.error('🚨 Excessive role loading detected in UnifiedRoleDrawer');
  });

  // Calculate isAdminRole early to avoid scope issues
  const isSystemRole = role?.is_system_role || false;
  const isAdminRole = role?.name === 'Admin';

  // Get all available permissions for Admin role
  const allPermissions = PLATFORM_MODULES.map(p => p.id);

  // Initialize permissions when role changes with infinite loop prevention
  useSafeEffect(() => {
    if (!trackRoleLoad()) return;
    
    if (role) {
      if (role.name === 'Admin') {
        // Admin role should always have all permissions
        setCurrentPermissions(allPermissions);
      } else {
        setCurrentPermissions(role.permissions || []);
      }
    }
  }, [role, allPermissions], 'rolePermissionInit', 10);

  // Reset states when drawer closes to prevent memory leaks
  useSafeEffect(() => {
    if (!isOpen) {
      // Clear any pending timeouts
      if (permissionUpdateTimeoutRef.current) {
        clearTimeout(permissionUpdateTimeoutRef.current);
        permissionUpdateTimeoutRef.current = null;
      }
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Reset states
      setActiveTab('details');
      setMembers([]);
      setAvailableUsers([]);
      setIsLoadingMembers(false);
      setIsLoadingAvailable(false);
      setIsAddUserModalOpen(false);
      setSelectedUserId('');
      setSearchTerm('');
      setIsRemovingUser(null);
      setIsAddingUser(false);
      setIsSavingRole(false);
      setIsUpdatingPermissions(false);
      lastPermissionUpdateRef.current = '';
    }
  }, [isOpen], 'drawerReset', 5);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', description: '', is_default: false },
  });

  // Cleanup form when component unmounts
  useSafeEffect(() => {
    return () => {
      form.reset();
    };
  }, [form], 'formCleanup', 1);

  // Load role data when drawer opens
  useSafeEffect(() => {
    if (isOpen && role) {
      form.reset({
        name: role.name,
        description: role.description || '',
        is_default: role.is_default || false
      });
      
      // For Admin role, always show all permissions
      if (role.name === 'Admin') {
        setCurrentPermissions(allPermissions);
      } else {
        setCurrentPermissions(role.permissions || []);
      }
      
      if (activeTab === 'members') {
        loadGroupMembers();
      }
    }
  }, [isOpen, role, form, activeTab, allPermissions], 'roleDataLoad', 10);

  // Load group members when members tab is selected
  useSafeEffect(() => {
    if (isOpen && role && activeTab === 'members') {
      loadGroupMembers();
    }
  }, [isOpen, role, activeTab], 'membersTabLoad', 5);

  // Load available users when add user modal opens
  useSafeEffect(() => {
    if (isAddUserModalOpen && role) {
      loadAvailableUsers();
    }
  }, [isAddUserModalOpen, role, searchTerm], 'availableUsersLoad', 10);

  // Cleanup effect to prevent memory leaks and handle component unmounting
  useSafeEffect(() => {
    return () => {
      // Clear any pending timeout
      if (permissionUpdateTimeoutRef.current) {
        clearTimeout(permissionUpdateTimeoutRef.current);
        permissionUpdateTimeoutRef.current = null;
      }
      
      // Abort any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [], 'componentCleanup', 1);



  const loadGroupMembers = async () => {
    if (!role) return;
    
    // Create abort controller for this request
    const abortController = new AbortController();
    
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`/api/settings/user-groups/${role.id}/members`, {
        signal: abortController.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load group members' }));
        throw new Error(errorData.message || 'Failed to load group members');
      }
      
      const data = await response.json();
      setMembers(data.users || []);
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      console.error('Error loading group members:', error);
      toast.error((error as Error).message || 'Failed to load group members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!role) return;
    
    // Create abort controller for this request
    const abortController = new AbortController();
    
    setIsLoadingAvailable(true);
    try {
      const url = new URL('/api/users', window.location.origin);
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }
      
      const response = await fetch(url.toString(), {
        signal: abortController.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load users' }));
        throw new Error(errorData.message || 'Failed to load users');
      }
      
      const data = await response.json();
      setAvailableUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      console.error('Error loading users:', error);
      toast.error((error as Error).message || 'Failed to load users');
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleRoleFormSubmit = async (data: RoleFormValues) => {
    if (!role) return;
    
    setIsSavingRole(true);
    try {
      const response = await fetch(`/api/settings/user-groups/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          permissions: currentPermissions
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update role' }));
        throw new Error(errorData.message || 'Failed to update role');
      }
      
      const result = await response.json();
      toast.success(`Role "${result.name}" updated successfully`);
      // Only call onRoleChange for role detail changes, not permission changes
      onRoleChange?.();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error((error as Error).message || 'Failed to update role');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handlePermissionUpdate = useCallback(async (permissions: PlatformModuleId[]) => {
    if (!role) return;
    
    // Prevent infinite loops with tracking
    if (!trackPermissionUpdate()) {
      console.warn('Permission update blocked due to excessive calls');
      return;
    }
    
    // Prevent duplicate permission updates
    const permissionString = JSON.stringify(permissions.sort());
    if (lastPermissionUpdateRef.current === permissionString) {
      console.warn('Permission update prevented - no changes detected');
      return;
    }
    lastPermissionUpdateRef.current = permissionString;

    console.log('Permission update triggered:', permissions);
    
    // Update local state immediately for better UX
    setCurrentPermissions(permissions);
    
    // Clear any existing timeout
    if (permissionUpdateTimeoutRef.current) {
      clearTimeout(permissionUpdateTimeoutRef.current);
      permissionUpdateTimeoutRef.current = null;
    }
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Debounce the API call to prevent rapid requests
    permissionUpdateTimeoutRef.current = setTimeout(async () => {
      if (!role) return;
      
      console.log('Sending permission update to API...');
      setIsUpdatingPermissions(true);
      
      // Ensure Admin role always has all permissions
      const finalPermissions = isAdminRole ? allPermissions : permissions;
      
      const requestBody = {
        name: role.name,
        description: role.description,
        permissions: finalPermissions,
        is_default: role.is_default
      };
      
      try {
        const response = await fetch(`/api/settings/user-groups/${role.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current?.signal,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to update permissions' }));
          throw new Error(errorData.message || 'Failed to update permissions');
        }
        
        console.log('Permission update successful');
        
        // Update the role object locally to avoid reload
        if (role) {
          role.permissions = finalPermissions;
        }
        
        // Show toast notification without reloading the UI
        toast.success('Permissions updated successfully', {
          duration: 3000,
          position: 'top-right'
        });
        
        // Don't call onRoleChange to avoid drawer reload
        // onRoleChange?.();
      } catch (error) {
        // Don't show error if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        console.error('Error updating permissions:', error);
        toast.error((error as Error).message || 'Failed to update permissions');
        // Revert on error
        setCurrentPermissions(role.permissions || []);
      } finally {
        setIsUpdatingPermissions(false);
        abortControllerRef.current = null;
      }
    }, 500); // 500ms debounce delay
  }, [role, isAdminRole, allPermissions, trackPermissionUpdate]);

  const handleAddUser = async () => {
    if (!selectedUserId || !role) return;
    
    setIsAddingUser(true);
    try {
      const response = await fetch(`/api/settings/user-groups/${role.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add user to group' }));
        throw new Error(errorData.message || 'Failed to add user to group');
      }
      
      toast.success('User added to group successfully');
      setIsAddUserModalOpen(false);
      setSelectedUserId('');
      loadGroupMembers();
      onMembersChange?.();
    } catch (error) {
      console.error('Error adding user to group:', error);
      toast.error((error as Error).message || 'Failed to add user to group');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!role) return;
    
    setIsRemovingUser(userId);
    try {
      const response = await fetch(`/api/settings/user-groups/${role.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to remove user from group' }));
        throw new Error(errorData.message || 'Failed to remove user from group');
      }
      
      toast.success(`User ${userName} removed from group successfully`);
      loadGroupMembers();
      onMembersChange?.();
    } catch (error) {
      console.error('Error removing user from group:', error);
      toast.error((error as Error).message || 'Failed to remove user from group');
    } finally {
      setIsRemovingUser(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Prevent rendering if no role is provided
  if (!role) {
    return null;
  }

  // Prevent infinite loops by checking if component is mounted
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Error boundary for the component
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-[85vw] sm:max-w-[80vw] md:max-w-[75vw] lg:max-w-[70vw] xl:max-w-[900px] h-screen flex flex-col p-0">
          <SheetHeader className="flex-shrink-0 p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              {role.name} - Role Management
            </SheetTitle>
            <SheetDescription>
              Manage role details, permissions, and members for {role.name}
            </SheetDescription>
          </SheetHeader>

                     <div className="flex-1 flex flex-col min-h-0">
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
                           <Settings2 className="h-4 w-4" />
                           Details
                         </div>
                         <div
                           onClick={() => setActiveTab('permissions')}
                           className={cn(
                             "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                             activeTab === 'permissions'
                               ? "text-primary border-b-2 border-primary"
                               : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                           )}
                         >
                           <ShieldCheck className="h-4 w-4" />
                           Permissions
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

               <div className="flex-1 flex flex-col  min-h-0">
                 {activeTab === 'details' && (
                   <div className="flex-1 min-h-0 flex flex-col">
                     <div className="p-6 pb-4">
                       <h3 className="text-lg font-semibold">Role Details</h3>
                       <p className="text-sm text-muted-foreground">
                         {isAdminRole ? 'Admin role details cannot be modified' : 'Update role information'}
                       </p>
                     </div>
                     <div className="px-6 pb-6">
                       <Form {...form}>
                         <form onSubmit={form.handleSubmit(handleRoleFormSubmit)} className="space-y-4">
                           <FormField 
                             control={form.control} 
                             name="name" 
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Role Name *</FormLabel>
                                 <FormControl>
                                   <Input {...field} disabled={isAdminRole} />
                                 </FormControl>
                                 <FormMessage />
                                 {isAdminRole && (
                                   <p className="text-xs text-muted-foreground">
                                     Admin role name cannot be changed.
                                   </p>
                                 )}
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
                                   <Textarea {...field} value={field.value ?? ''} />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )} 
                           />
                           
                           <FormField 
                             control={form.control} 
                             name="is_default" 
                             render={({ field }) => (
                               <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
                                 <FormControl>
                                   <Checkbox 
                                     checked={Boolean(field.value)} 
                                     onCheckedChange={(checked) => field.onChange(checked)} 
                                   />
                                 </FormControl>
                                 <FormLabel className="font-normal">Set as Default Role</FormLabel>
                               </FormItem>
                             )} 
                           />

                           <div className="flex justify-end pt-4">
                             <Button 
                               type="submit" 
                               disabled={isSavingRole || isAdminRole}
                               className="flex items-center gap-2"
                             >
                               {isSavingRole ? (
                                 <Loader2 className="h-4 w-4 animate-spin" />
                               ) : (
                                 <Save className="h-4 w-4" />
                               )}
                               Save Changes
                             </Button>
                           </div>
                         </form>
                       </Form>
                     </div>
                   </div>
                 )}

                 {activeTab === 'permissions' && (
                   <div 
                     className="flex-1 min-h-0 flex flex-col"
                     onKeyDown={(e) => {
                       // Prevent form submission on Enter key
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         e.stopPropagation();
                       }
                     }}
                   >
                     <RolePermissionSelector
                       key={`${role.id}-${currentPermissions.length}`}
                       selectedPermissions={isAdminRole ? PLATFORM_MODULES.map(p => p.id) : currentPermissions}
                       onPermissionsChange={handlePermissionUpdate}
                       disabled={isAdminRole || isUpdatingPermissions}
                       isLoading={isUpdatingPermissions}
                       title={`${role.name} Permissions`}
                       description={isAdminRole ? 
                         "Admin role has all permissions by default and cannot be modified." : 
                         isUpdatingPermissions ? "Updating permissions..." :
                         "Configure what users with this role can do."
                       }
                       className="h-full"
                       noCard={true}
                     />
                   </div>
                 )}

                 {activeTab === 'members' && (
                   <div className="flex-1 min-h-0 flex flex-col">
                     <div className="flex justify-between items-center p-6 pb-4">
                       <div>
                         <h3 className="text-lg font-semibold">Group Members</h3>
                         <p className="text-sm text-muted-foreground">
                           Manage users in the {role.name} role. Currently {members.length} member{members.length !== 1 ? 's' : ''}.
                         </p>
                       </div>
                       <Button 
                         onClick={() => setIsAddUserModalOpen(true)}
                         size="sm"
                         className="flex items-center gap-2"
                       >
                         <UserPlus className="h-4 w-4" />
                         Add User
                       </Button>
                     </div>
                     <div className="flex-1 min-h-0 overflow-hidden px-6">
                       <div className="flex-1 min-h-0 overflow-hidden">
                         {isLoadingMembers ? (
                           <div className="flex items-center justify-center h-32">
                             <Loader2 className="h-8 w-8 animate-spin" />
                           </div>
                         ) : members.length === 0 ? (
                           <div className="flex flex-col items-center justify-center h-32 text-center">
                             <Users className="h-12 w-12 text-muted-foreground mb-4" />
                             <p className="text-muted-foreground mb-2">No members in this role</p>
                             <Button 
                               onClick={() => setIsAddUserModalOpen(true)}
                               variant="outline"
                               size="sm"
                             >
                               <UserPlus className="h-4 w-4 mr-2" />
                               Add First Member
                             </Button>
                           </div>
                         ) : (
                           <ScrollArea className="h-full">
                             <Table>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead className="w-[40%] min-w-[200px]">User</TableHead>
                                   <TableHead className="w-[20%] min-w-[100px] hidden sm:table-cell">Role</TableHead>
                                   <TableHead className="w-[25%] min-w-[120px] hidden md:table-cell">Joined</TableHead>
                                   <TableHead className="w-[15%] text-right">Actions</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {members.map((member) => (
                                   <TableRow key={member.id}>
                                     <TableCell className="w-[40%] min-w-[200px]">
                                       <div className="flex items-center gap-3">
                                         <Avatar className="h-8 w-8 flex-shrink-0 rounded-full">
                                           <AvatarFallback className="text-xs rounded-full">
                                             {getInitials(member.name)}
                                           </AvatarFallback>
                                         </Avatar>
                                         <div className="min-w-0 flex-1">
                                           <div className="font-medium truncate">{member.name}</div>
                                           <div className="text-sm text-muted-foreground flex items-center gap-1">
                                             <Mail className="h-3 w-3 flex-shrink-0" />
                                             <span className="truncate">{member.email}</span>
                                           </div>
                                         </div>
                                       </div>
                                     </TableCell>
                                     <TableCell className="w-[20%] min-w-[100px] hidden sm:table-cell">
                                       <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                                     </TableCell>
                                     <TableCell className="w-[25%] min-w-[120px] hidden md:table-cell">
                                       <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                         <Calendar className="h-3 w-3 flex-shrink-0" />
                                         <span className="truncate">{formatDate(member.createdAt)}</span>
                                       </div>
                                     </TableCell>
                                     <TableCell className="w-[15%] text-right">
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleRemoveUser(member.id, member.name)}
                                         disabled={isRemovingUser === member.id}
                                         className="text-destructive hover:text-destructive"
                                       >
                                         {isRemovingUser === member.id ? (
                                           <Loader2 className="h-4 w-4 animate-spin" />
                                         ) : (
                                           <UserMinus className="h-4 w-4" />
                                         )}
                                       </Button>
                                     </TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </ScrollArea>
                         )}
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             </div>
        </SheetContent>
      </Sheet>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full z-[100]">
          <DialogHeader>
            <DialogTitle>Add User to {role.name}</DialogTitle>
            <DialogDescription>
              Select a user to add to this role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to add" />
                </SelectTrigger>
                <SelectContent className="z-[100003]">
                  {/* Search inside dropdown */}
                  <div className="relative p-2 border-b">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-8 text-sm"
                    />
                  </div>
                  
                  {isLoadingAvailable ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchTerm ? 'No users found matching your search' : 'No users available'}
                    </div>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto">
                      {availableUsers.map((user) => {
                        const isAlreadyMember = members.some(member => member.id === user.id);
                        return (
                          <SelectItem 
                            key={user.id} 
                            value={user.id}
                            disabled={isAlreadyMember}
                            className={isAlreadyMember ? 'opacity-60 cursor-not-allowed' : ''}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Avatar className="h-6 w-6 flex-shrink-0 rounded-full">
                                <AvatarFallback className="text-xs rounded-full">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                              </div>
                              {isAlreadyMember && (
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setSelectedUserId('');
                  setSearchTerm('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={!selectedUserId || isAddingUser}
                className="flex items-center gap-2"
              >
                {isAddingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
