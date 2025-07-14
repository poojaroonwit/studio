"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { UserGroup, PlatformModule, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, Save, Loader2, ServerCrash, ShieldAlert, Users, ShieldCheck, Settings2, X, MoreHorizontal } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { Switch } from "@/components/ui/switch";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RolePermissionSelector } from '@/components/settings/RolePermissionSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const platformModuleIds = PLATFORM_MODULES.map(m => m.id) as [PlatformModuleId, ...PlatformModuleId[]];

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().optional().nullable(),
  permissions: z.array(z.enum(platformModuleIds)).optional().default([]),
  is_default: z.boolean().optional().default(false),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

// Group permissions by category for display
const groupedPermissions = Object.values(PLATFORM_MODULE_CATEGORIES).map(category => ({
  category,
  permissions: PLATFORM_MODULES.filter(p => p.category === category)
}));

export default function RolesPermissionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [roles, setRoles] = useState<UserGroup[]>([]); // UserGroups are now "Roles"
  const [selectedRole, setSelectedRole] = useState<UserGroup | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserGroup | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<UserGroup | null>(null);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', description: '', permissions: [], is_default: false },
  });

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
      if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('USER_GROUPS_MANAGE')) {
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
    setSelectedRole(role);
    setIsPermissionModalOpen(true);
  };

  const handleOpenModal = (role: UserGroup | null = null) => {
    setEditingRole(role);
    form.reset(role ? { name: role.name, description: role.description || '', permissions: role.permissions || [], is_default: role.is_default || false } : { name: '', description: '', permissions: [], is_default: false });
    setIsModalOpen(true);
  };

  const handleRoleFormSubmit = async (data: RoleFormValues) => {
    const url = editingRole ? `/api/settings/user-groups/${editingRole.id}` : '/api/settings/user-groups';
    const method = editingRole ? 'PUT' : 'POST';

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
  
  const handlePermissionUpdate = async (roleId: string, permissions: PlatformModuleId[]) => {
    const role = roles.find(r => r.id === roleId);
    if (!role || role.is_system_role) {
      toast.error("Permissions for system roles cannot be changed.");
      return;
    }

    try {
      const response = await fetch(`/api/settings/user-groups/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: role.name, 
          description: role.description, 
          permissions, 
          is_default: role.is_default 
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to update role permissions.");
      
      toast.success(`Permissions for role "${role.name}" updated.`);
      // Update local state for immediate UI feedback
      setSelectedRole(prev => prev ? { ...prev, permissions } : null);
      setRoles(prevRoles => prevRoles.map(r => r.id === roleId ? { ...r, permissions } : r));
    } catch (error) {
      toast.error((error as Error).message);
      // Revert local state on error
      fetchRoles();
    }
  };

  const confirmDelete = (role: UserGroup) => {
    setRoleToDelete(role);
  };

  const handleDelete = async () => {
    if (!roleToDelete) {
      setRoleToDelete(null);
      return;
    }
    try {
      const response = await fetch(`/api/settings/user-groups/${roleToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete role');
      }
      toast.success('Role deleted successfully.');
      fetchRoles(); // Refresh list
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRoleToDelete(null);
    }
  };

  if (sessionStatus === 'loading' || (isLoading && !fetchError && roles.length === 0 && !selectedRole)) {
    return ( <div className="flex h-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div> );
  }

  if (fetchError && !isLoading) {
    const isPermissionError = fetchError === "You do not have permission to manage roles & permissions.";
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Data</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        {isPermissionError ? (<Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Dashboard</Button>) : (<Button onClick={() => fetchRoles()} className="btn-hover-primary-gradient">Try Again</Button>)}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage user roles and their associated permissions</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="btn-primary-gradient">
          <PlusCircle className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </div>

      {/* Full Width Table */}
      <div className="flex-1 bg-card border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading roles...</p>
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No roles defined.</p>
                  <Button onClick={() => handleOpenModal()} className="btn-primary-gradient">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create First Role
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow 
                  key={role.id} 
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedRole?.id === role.id && "bg-primary/5"
                  )}
                  onClick={() => handleSelectRole(role)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{role.name}</span>
                      {role.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {role.description || 'No description'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {role.is_system_role ? (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        System
                      </Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {role.user_count || 0} users
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {role.is_system_role && role.name === 'Admin' ? 'All' : (role.permissions || []).length + ' permissions'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!role.is_system_role || role.name === 'Admin' ? (
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); handleOpenModal(role); }}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Role
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleSelectRole(role); }}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Permissions
                          </DropdownMenuItem>
                          {!role.is_system_role && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); confirmDelete(role); }} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
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

      {/* Permission Settings Modal */}
      <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
              {selectedRole?.name} - Permission Settings
            </DialogTitle>
            <DialogDescription>
              Configure what users with the "{selectedRole?.name}" role can do.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {selectedRole && (
              <RolePermissionSelector
                selectedPermissions={selectedRole.is_system_role && selectedRole.name === 'Admin' ? platformModuleIds : selectedRole.permissions || []}
                onPermissionsChange={permissions => {
                  if (selectedRole.is_system_role && selectedRole.name === 'Admin') return; // Prevent editing
                  setSelectedRole(prev => prev ? { ...prev, permissions } : null);
                  setRoles(prevRoles => prevRoles.map(r => r.id === selectedRole.id ? { ...r, permissions } : r));
                  handlePermissionUpdate(selectedRole.id, permissions);
                }}
                disabled={selectedRole.is_system_role && selectedRole.name === 'Admin'}
                className="h-full"
              />
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Role Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? `Update the details for the "${editingRole.name}" role.` : 'Define a new role. Permissions are managed on the main page after creation.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form as any}>
            <form onSubmit={form.handleSubmit(handleRoleFormSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name *</FormLabel>
                  <FormControl><Input {...field} disabled={editingRole?.is_system_role} /></FormControl>
                  <FormMessage />
                   {editingRole?.is_system_role && <p className="text-xs text-muted-foreground">System role names cannot be changed.</p>}
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_default" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
                  <FormControl><Checkbox checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked)} /></FormControl>
                  <FormLabel className="font-normal">Set as Default Role</FormLabel>
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
              disabled={form.formState.isSubmitting || (editingRole?.is_system_role && form.getValues("name") === editingRole.name && !form.getFieldState("description").isDirty && !form.getFieldState("is_default").isDirty )} 
              className="btn-primary-gradient flex items-center gap-2"
              onClick={form.handleSubmit(handleRoleFormSubmit)}
            >
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {roleToDelete && (
        <AlertDialog open={!!roleToDelete} onOpenChange={(open) => { if(!open) setRoleToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the role "<strong>{roleToDelete.name}</strong>". This action cannot be undone.
                Users will lose permissions granted by this role.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>
                Delete Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

