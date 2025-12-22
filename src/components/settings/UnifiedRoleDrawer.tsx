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
  Edit3,
  AlertTriangle
} from 'lucide-react';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES } from '@/lib/types';
import { RolePermissionSelector } from './RolePermissionSelector';
import { cn } from '@/lib/utils';
import { handleApiResponse, handleApiResponseJson } from '@/lib/networkUtils';

// Error boundary component for UnifiedRoleDrawer
class UnifiedRoleDrawerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UnifiedRoleDrawer error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the role drawer. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
// Removed complex safe effect and infinite loop prevention - using simple useEffect instead

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
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isMounted, setIsMounted] = useState(false);
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
  
  // Member search and pagination state
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const membersPerPage = 10;

  // Refs for debouncing and request cancellation
  const permissionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPermissionUpdateRef = useRef<string>('');

  // Simple tracking for debugging (removed complex infinite loop prevention)
  const permissionUpdateCount = useRef(0);
  const roleLoadCount = useRef(0);
  
  // Add render counter to prevent infinite loops
  const renderCount = useRef(0);
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Get all available permissions for Admin role with defensive checks - MEMOIZED to prevent infinite loops
  const allPermissions = React.useMemo(() => {
    try {
      if (!Array.isArray(PLATFORM_MODULES)) {
        console.warn('UnifiedRoleDrawer: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
        return [];
      }
      return PLATFORM_MODULES.map(p => p?.id).filter(Boolean);
    } catch (error) {
      console.error('UnifiedRoleDrawer: Error getting all permissions:', error);
      return [];
    }
  }, []); // Empty dependency array since PLATFORM_MODULES is static

  // Calculate isAdminRole early to avoid scope issues
  const isSystemRole = role?.isSystemRole || false;
  const isAdminRole = role?.name === 'Admin';

  // Initialize permissions when role changes - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    // Simple tracking (removed complex infinite loop prevention)
    roleLoadCount.current++;
    
    if (role) {
      if (role?.isSystemRole) {
        // System roles (Admin, User, etc.) should always show all their assigned permissions
        // Defensive check to prevent React error #185
        const rolePermissions = Array.isArray(role?.permissions) ? role?.permissions : [];
        // Additional validation to ensure all permissions are valid strings
        const validPermissions = rolePermissions.filter(p => typeof p === 'string' && p.length > 0);
        setCurrentPermissions(validPermissions);
      } else {
        // Defensive check to prevent React error #185
        const rolePermissions = Array.isArray(role?.permissions) ? role?.permissions : [];
        // Additional validation to ensure all permissions are valid strings
        const validPermissions = rolePermissions.filter(p => typeof p === 'string' && p.length > 0);
        setCurrentPermissions(validPermissions);
      }
    } else {
      // Reset permissions when role is null
      setCurrentPermissions([]);
    }
  }, [role?.id, role?.isSystemRole, allPermissions]); // FIXED: Only depend on role properties that matter

  // Reset states when drawer closes to prevent memory leaks - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
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
  }, [isOpen]); // FIXED: Remove max run limit

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', description: '', is_default: false },
  });

  // Cleanup form when component unmounts - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]); // FIXED: Include form in dependencies

  // Load role data when drawer opens - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    if (isOpen && role) {
      form.reset({
        name: role?.name || '',
        description: role?.description || '',
                 is_default: role?.isDefault || false
      });
      
      // For system roles, show their assigned permissions (don't modify)
      setCurrentPermissions(role?.permissions || []);
      
      if (activeTab === 'members') {
        loadGroupMembers();
      }
    }
  }, [isOpen, role, form, activeTab]); // FIXED: Remove max run limit and allPermissions dependency

  // Load group members when members tab is selected - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    if (isOpen && role && activeTab === 'members') {
      loadGroupMembers();
    }
  }, [isOpen, role, activeTab]); // FIXED: Remove max run limit

  // Load available users when add user modal opens - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
    if (isAddUserModalOpen && role) {
      loadAvailableUsers();
    }
  }, [isAddUserModalOpen, role, searchTerm]); // FIXED: Remove max run limit

  // Cleanup effect to prevent memory leaks and handle component unmounting - FIXED: Use useEffect instead of useSafeEffect
  useEffect(() => {
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
  }, []); // FIXED: Empty dependency array for cleanup

  const handlePermissionUpdate = useCallback(async (permissions: PlatformModuleId[]) => {
    // Don't update permissions for system roles - CHECK THIS FIRST
    if (role?.isSystemRole) {
      return;
    }
    
    if (!role?.id) {
      console.error('handlePermissionUpdate: role.id is missing');
      return;
    }
    
    // Log the role ID for debugging
    // Validate that role.id is a valid UUID format
    if (typeof role.id !== 'string' || !role.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('handlePermissionUpdate: Invalid role ID format:', role.id);
      toast.error('Invalid role ID format. Please refresh the page.');
      return;
    }
    
    // Prevent infinite loops with tracking
    // Simple tracking (removed complex infinite loop prevention)
    permissionUpdateCount.current++;
    
    // Prevent excessive calls
    if (permissionUpdateCount.current > 50) {
      console.warn('Permission update blocked due to excessive calls');
      return;
    }
    
    // Prevent duplicate permission updates
    const permissionString = JSON.stringify(permissions.sort());
    if (lastPermissionUpdateRef.current === permissionString) {
      return;
    }
    lastPermissionUpdateRef.current = permissionString;
    
    // Optimistically update local state immediately
    setCurrentPermissions(permissions);

    // Debounce permission updates
    if (permissionUpdateTimeoutRef.current) {
      clearTimeout(permissionUpdateTimeoutRef.current);
    }
    
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setIsUpdatingPermissions(true);
    
    permissionUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/settings/user-groups/${role.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions }),
          signal,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to update permissions' }));
          throw new Error(errorData.message || 'Failed to update permissions');
        }
        
        const result = await response.json();
        // Update with server source of truth (should match optimistic state)
        setCurrentPermissions(result.permissions || []);
        toast.success('Permissions updated successfully');
        // onRoleChange?.(); // Don't trigger parent refresh for permission updates to avoid drawer reset
      } catch (error) {
        // Don't show error if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        // Revert optimistic update on error
        console.error('Error updating permissions:', error);
        toast.error((error as Error).message || 'Failed to update permissions');
        // Revert to original role permissions 
        if (role?.permissions) {
             setCurrentPermissions(role.permissions);
        }
      } finally {
        setIsUpdatingPermissions(false);
      }
    }, 500); // 500ms debounce
  }, [role?.id, role?.isSystemRole, role?.name, onRoleChange, role?.permissions]);

  // Safety check to prevent infinite renders (after all hooks)
  renderCount.current++;
  if (renderCount.current > 100) {
    console.error('UnifiedRoleDrawer: Too many renders detected, preventing infinite loop');
    return null;
  }

  // Early validation checks (after all hooks)
  if (!role) {
    console.error('UnifiedRoleDrawer: Role is null or undefined');
    return null;
  }

  if (!role.id || typeof role.id !== 'string') {
    console.error('UnifiedRoleDrawer: Invalid role ID:', role.id, 'type:', typeof role.id);
    return null;
  }
  
  // Validate UUID format
  if (!role.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    console.error('UnifiedRoleDrawer: Role ID is not a valid UUID:', role.id);
    return null;
  }
  
  if (!role.name || typeof role.name !== 'string') {
    console.error('UnifiedRoleDrawer: Invalid role name:', role.name);
    return null;
  }
  
  // Ensure permissions is always an array to prevent React error #185
  if (!Array.isArray(role.permissions)) {
    console.warn('UnifiedRoleDrawer: Role permissions is not an array, setting to empty array:', role.permissions);
    role.permissions = [];
  }

  const loadGroupMembers = async () => {
    if (!role?.id) return;
    
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
    if (!role?.id) return;
    
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
    if (!role?.id) return;
    
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

  const handleAddUser = async () => {
    if (!selectedUserId || !role?.id) return;
    
    setIsAddingUser(true);
    try {
      const response = await fetch(`/api/settings/user-groups/${role.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      
      handleApiResponse(response, 'Failed to add user to group');
      
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
    if (!role?.id) return;
    
    setIsRemovingUser(userId);
    try {
      const response = await fetch(`/api/settings/user-groups/${role.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      
      handleApiResponse(response, 'Failed to remove user from group');
      
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

  // Prevent rendering if component is not mounted
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-[85vw] sm:max-w-[80vw] md:max-w-[75vw] lg:max-w-[70vw] xl:max-w-[900px] flex flex-col p-0" sheetId="unified-role-drawer">
          <UnifiedRoleDrawerErrorBoundary>
      
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
                         {isSystemRole ? 'System role details cannot be modified' : 'Update role information'}
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
                                   <Input {...field} disabled={isSystemRole} />
                                 </FormControl>
                                 <FormMessage />
                                 {isSystemRole && (
                                   <p className="text-xs text-muted-foreground">
                                     System role name cannot be changed.
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
                               disabled={isSavingRole || isSystemRole}
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
                       key={role?.id || 'unknown'}
                       selectedPermissions={Array.isArray(currentPermissions) ? currentPermissions : []}
                       onPermissionsChange={handlePermissionUpdate}
                       disabled={isSystemRole}
                       isLoading={isUpdatingPermissions}
                       title={`${role?.name || 'Unknown'} Permissions`}
                       description={isSystemRole ? 
                         "System role permissions cannot be modified." : 
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
                           Manage users in the {role?.name || 'Unknown'} role. Currently {members.length} member{members.length !== 1 ? 's' : ''}.
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
                     
                     {/* Member Search */}
                     <div className="px-6 pb-3">
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input
                           placeholder="Search members by name or email..."
                           value={memberSearchTerm}
                           onChange={(e) => {
                             setMemberSearchTerm(e.target.value);
                             setMemberPage(1); // Reset to first page on search
                           }}
                           className="pl-10"
                         />
                       </div>
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
                          ) : (() => {
                            // Filter members by search term
                            const filteredMembers = members.filter(member => 
                              member && member.id && member.name && (
                                !memberSearchTerm ||
                                member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                                member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
                              )
                            );
                            
                            // Pagination calculations
                            const totalFilteredMembers = filteredMembers.length;
                            const totalPages = Math.ceil(totalFilteredMembers / membersPerPage);
                            const startIndex = (memberPage - 1) * membersPerPage;
                            const paginatedMembers = filteredMembers.slice(startIndex, startIndex + membersPerPage);
                            
                            return (
                              <>
                                <ScrollArea className="h-[300px]">
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
                                      {paginatedMembers.map((member) => (
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
                                
                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between border-t pt-4 mt-4">
                                    <div className="text-sm text-muted-foreground">
                                      Showing {startIndex + 1}-{Math.min(startIndex + membersPerPage, totalFilteredMembers)} of {totalFilteredMembers} members
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                                        disabled={memberPage === 1}
                                      >
                                        Previous
                                      </Button>
                                      <span className="text-sm">
                                        Page {memberPage} of {totalPages}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMemberPage(p => Math.min(totalPages, p + 1))}
                                        disabled={memberPage === totalPages}
                                      >
                                        Next
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
               </div>
             </div>
           </UnifiedRoleDrawerErrorBoundary>
        </SheetContent>
      </Sheet>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full" dialogId="unified-role-add-user-modal">
          <DialogHeader>
            <DialogTitle>Add User to {role?.name || 'Unknown'}</DialogTitle>
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
                <SelectContent selectId="unified-role-user-select">
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
                      {availableUsers.filter(user => user && user.id && user.name).map((user) => {
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
