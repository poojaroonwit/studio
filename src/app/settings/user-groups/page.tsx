"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, Save, Loader2, ServerCrash, ShieldAlert, Users, ShieldCheck, Settings2, X, MoreHorizontal } from 'lucide-react';
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
      console.warn('RolesPermissionsPage: PLATFORM_MODULES is not an array at module level:', PLATFORM_MODULES);
      return [];
    }
    return PLATFORM_MODULES.map(m => m.id);
  } catch (error) {
    console.error('RolesPermissionsPage: Error creating platformModuleIds:', error);
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



export default function RolesPermissionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);

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
      if (session.user.role !== 'Admin') {
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

  const handleSelectRole = (role: UserGroup) => {
    setSelectedRole(role);
    setIsUnifiedDrawerOpen(true);
  };

  const handleOpenModal = (role: UserGroup | null = null) => {
    setEditingRole(role);
            form.reset(role ? { name: role.name, description: role.description || '', permissions: role.permissions || [], is_default: role.isDefault || false } : { name: '', description: '', permissions: [], is_default: false });
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
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          )}
          <p className="text-muted-foreground">Manage user roles and their associated permissions</p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="default">
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
                  <Button onClick={() => handleOpenModal()} variant="default">
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
                      {role.isDefault && (
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
                    {role.isSystemRole ? (
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
                      {role.isSystemRole && role.name === 'Admin' ? 'All' : (role.permissions || []).length + ' permissions'}
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
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleSelectRole(role); }}>
                            <Edit3 className="mr-2 h-4 w-4" /> Manage Role
                          </DropdownMenuItem>
                          {!role.isSystemRole && (
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
                  <FormControl><Input {...field} disabled={editingRole?.isSystemRole} /></FormControl>
                  <FormMessage />
                   {editingRole?.isSystemRole && <p className="text-xs text-muted-foreground">System role names cannot be changed.</p>}
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
                              disabled={form.formState.isSubmitting || (editingRole?.isSystemRole && form.getValues("name") === editingRole.name && !form.getFieldState("description").isDirty && !form.getFieldState("is_default").isDirty )} 
              variant="default"
              className="flex items-center gap-2"
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

      {/* Unified Role Drawer */}
      {selectedRole && (
        <UnifiedRoleDrawer
          isOpen={isUnifiedDrawerOpen}
          onOpenChange={setIsUnifiedDrawerOpen}
          role={selectedRole}
          onRoleChange={fetchRoles}
          onMembersChange={fetchRoles}
        />
      )}
    </div>
  );
}

