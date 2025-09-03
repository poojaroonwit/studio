"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, Save, Loader2, ServerCrash, ShieldAlert, Users, ShieldCheck, Settings2, X, MoreHorizontal, Info, AlertTriangle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
import { UnifiedRoleDrawer } from '@/components/settings/UnifiedRoleDrawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const platformModuleIds = (() => {
  try {
    if (!Array.isArray(PLATFORM_MODULES)) {
      console.warn('UserGroupsTab: PLATFORM_MODULES is not an array at module level:', PLATFORM_MODULES);
      return [];
    }
    return PLATFORM_MODULES.map(m => m?.id).filter(Boolean);
  } catch (error) {
    console.error('UserGroupsTab: Error creating platformModuleIds:', error);
    return [];
  }
})();

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional().default([]),
  is_default: z.boolean().optional().default(false),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

// Error boundary component for UserGroupsTab
class UserGroupsTabErrorBoundary extends React.Component<
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
    console.error('UserGroupsTab error:', error, errorInfo);
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
              There was an error loading the user groups. Please try refreshing the page.
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

export function UserGroupsTab() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [roles, setRoles] = useState<UserGroup[]>([]); // UserGroups are now "Roles"
  const [selectedRole, setSelectedRole] = useState<UserGroup | null>(null);
  const [isUnifiedDrawerOpen, setIsUnifiedDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserGroup | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<UserGroup | null>(null);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', description: '', permissions: [], is_default: false },
  });

  // Check if user has permission to manage roles
  const canManageRoles = modulePermissions.includes('USERS_PERMISSIONS_MANAGE') || 
    (Array.isArray(session?.user?.modulePermissions) && 
     (session.user.modulePermissions.includes('USER_GROUPS_CREATE') ||
      session.user.modulePermissions.includes('USER_GROUPS_EDIT') ||
      session.user.modulePermissions.includes('USER_GROUPS_DELETE')));

  const fetchRoles = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/user-groups');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch roles' }));
        if (response.status === 401 || response.status === 403) {
          signIn(undefined, { callbackUrl: pathname });
          return;
        }
        throw new Error(errorData.message);
      }
      const data: UserGroup[] = await response.json();
      setRoles(data);
    } catch (error) {
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, pathname]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated') {
      if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USER_GROUPS_VIEW')) {
        setFetchError("You do not have permission to manage roles & permissions.");
        setIsLoading(false);
      } else {
        fetchRoles();
      }
    }
  }, [sessionStatus, session, pathname, fetchRoles]);

  useEffect(() => {
    if (fetchError) {
      toast.error(fetchError);
    }
  }, [fetchError]);

  const handleSelectRole = (role: UserGroup) => {
    // Check if user has permission to manage roles
    if (!canManageRoles) {
      toast.error('You do not have permission to manage roles and permissions.');
      return;
    }
    
    // Enhanced defensive check to prevent React error #185
    try {
      if (!role) {
        console.error('UserGroupsTab: Role is null or undefined');
        toast.error('Invalid role data. Please try refreshing the page.');
        return;
      }
      
      if (!role.id || typeof role.id !== 'string') {
        console.error('UserGroupsTab: Invalid role ID:', role.id);
        toast.error('Invalid role ID. Please try refreshing the page.');
        return;
      }
      
      if (!role.name || typeof role.name !== 'string') {
        console.error('UserGroupsTab: Invalid role name:', role.name);
        toast.error('Invalid role name. Please try refreshing the page.');
        return;
      }
      
      // Ensure permissions is always an array
      if (!Array.isArray(role.permissions)) {
        console.warn('UserGroupsTab: Role permissions is not an array, setting to empty array:', role.permissions);
        role.permissions = [];
      }
      
      console.log('UserGroupsTab: handleSelectRole called with valid role:', role);
      console.log('UserGroupsTab: Setting selectedRole to:', role);
      console.log('UserGroupsTab: Setting isUnifiedDrawerOpen to true');
      
      setSelectedRole(role);
      setIsUnifiedDrawerOpen(true);
      
      console.log('UserGroupsTab: State should now be updated');
    } catch (error) {
      console.error('UserGroupsTab: Error in handleSelectRole:', error);
      toast.error('An error occurred while opening the role. Please try refreshing the page.');
    }
  };

  const handleOpenModal = (role: UserGroup | null = null) => {
    setEditingRole(role);
    form.reset(role ? { name: role.name, description: role.description || '', permissions: role.permissions || [], is_default: role.isDefault || false } : { name: '', description: '', permissions: [], is_default: false });
    setIsModalOpen(true);
  };

  const handleRoleFormSubmit = async (data: RoleFormValues) => {
    const url = editingRole ? `/api/settings/user-groups/${editingRole.id}` : '/api/settings/user-groups';
    const method = editingRole ? 'PUT' : 'POST';

    // Client-side validation: check if name already exists (for new groups only)
    if (!editingRole && roles.some(role => role.name.toLowerCase() === data.name.toLowerCase())) {
      toast.error(`A user group with the name "${data.name}" already exists.`);
      return;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Failed to ${editingRole ? 'update' : 'create'} role`);
      
      toast.success(`Role "${result.name}" was successfully ${editingRole ? 'updated' : 'created'}.`);
      setIsModalOpen(false);
      fetchRoles(); // Refresh list

    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      const response = await fetch(`/api/settings/user-groups/${roleToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete role' }));
        throw new Error(errorData.message);
      }
      toast.success(`Role "${roleToDelete.name}" was successfully deleted.`);
      setRoleToDelete(null);
      fetchRoles(); // Refresh list
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const modulePermissions = session?.user?.modulePermissions || [];
  const canViewUserGroups = modulePermissions.includes('USER_GROUPS_VIEW') || false;
  const canCreateUserGroups = modulePermissions.includes('USER_GROUPS_CREATE') || false;
  const canEditUserGroups = modulePermissions.includes('USER_GROUPS_EDIT') || false;
  const canDeleteUserGroups = modulePermissions.includes('USER_GROUPS_DELETE') || false;


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
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Roles</h2>
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
          <h2 className="text-xl font-semibold text-foreground">Roles & Permissions</h2>
          <p className="text-muted-foreground">Manage user roles and their permissions</p>
        </div>
        {canManageRoles && (
          <Button onClick={() => handleOpenModal()} className="btn-hover-primary-gradient">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        )}
      </div>

      {/* Info about default groups */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Default Groups</AlertTitle>
        <AlertDescription>
          The system includes three default groups: <strong>Admin</strong>, <strong>Recruiter</strong>, and <strong>Hiring Manager</strong>. 
          These groups cannot be deleted and have predefined permissions. You can create additional custom groups as needed.
        </AlertDescription>
      </Alert>

             {/* Roles List */}
       <div className="border rounded-lg overflow-hidden">
         {roles.length === 0 ? (
           <div className="text-center py-8">
             <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold text-foreground mb-2">No Roles Found</h3>
             <p className="text-muted-foreground mb-4">Create your first role to get started</p>
             {canManageRoles && (
               <Button onClick={() => handleOpenModal()} className="btn-hover-primary-gradient">
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Create First Role
               </Button>
             )}
           </div>
         ) : (
           <Table>
                           <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
                          <TableBody>
               {roles.filter(role => role && role.id && role.name).map((role) => {                 
                 return (
                   <TableRow key={role.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectRole(role)}>
                     <TableCell>
                       <div className="flex items-center gap-3">
                         <ShieldCheck className="h-5 w-5 text-primary" />
                         <span className="font-medium">{role.name}</span>
                       </div>
                     </TableCell>
                     <TableCell>
                       <span className="text-muted-foreground">
                         {role.description || 'No description'}
                       </span>
                     </TableCell>
                     <TableCell>
                       <span className="text-sm text-muted-foreground">
                         {Array.isArray(role.permissions) ? role.permissions.length : 0} permissions
                       </span>
                     </TableCell>
                     <TableCell>
                       <span className="text-sm text-muted-foreground">
                         {(role as any).memberCount ?? role.user_count ?? 0} users
                       </span>
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex items-center gap-2">
                         {canManageRoles && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-8 px-3"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleSelectRole(role);
                             }}
                           >
                             Manage
                           </Button>
                         )}
                         {!role.isDefault && canManageRoles && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-8 px-3 text-destructive hover:text-destructive"
                             onClick={(e) => {
                               e.stopPropagation();
                               setRoleToDelete(role);
                             }}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                     </TableCell>
                   </TableRow>
                 );
               })}
             </TableBody>
           </Table>
         )}
       </div>

      {/* Role Management Drawer */}
      {selectedRole && (
        <UnifiedRoleDrawer
          isOpen={isUnifiedDrawerOpen}
          onOpenChange={setIsUnifiedDrawerOpen}
          role={selectedRole}
          onRoleChange={() => {
            // After the drawer reports a role change, refresh roles from server
            fetchRoles();
          }}
          onMembersChange={() => {
            // Refresh the role to get updated member count
            fetchRoles();
          }}
        />
      )}

      {/* Create/Edit Role Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update role information and permissions' : 'Create a new role with specific permissions'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRoleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter role name" />
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
                      <Textarea {...field} value={field.value ?? ''} placeholder="Enter role description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                      {(() => {
                        try {
                          if (!Array.isArray(PLATFORM_MODULES)) {
                            console.warn('UserGroupsTab: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
                            return <div className="text-muted-foreground">No permissions available</div>;
                          }
                          
                          return PLATFORM_MODULES.map((module) => (
                            <FormField
                              key={module.id}
                              control={form.control}
                              name="permissions"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={module.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                                            <Checkbox
                        checked={field.value?.includes(module.id)}
                        onCheckedChange={(checked: boolean) => {
                          return checked
                            ? field.onChange([...field.value, module.id])
                            : field.onChange(
                                field.value?.filter(
                                  (value) => value !== module.id
                                )
                              )
                        }}
                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm font-medium">
                                        {module.label}
                                      </FormLabel>
                                      <p className="text-xs text-muted-foreground">
                                        {module.description}
                                      </p>
                                    </div>
                                  </FormItem>
                                )
                              }}
                            />
                          ));
                        } catch (error) {
                          console.error('UserGroupsTab: Error rendering permissions:', error);
                          return <div className="text-muted-foreground">Error loading permissions</div>;
                        }
                      })()}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Default Role</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Make this the default role for new users
                      </div>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open: boolean) => { if(!open) setRoleToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role <strong>{roleToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className={buttonVariants({ variant: "destructive" })}>
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
