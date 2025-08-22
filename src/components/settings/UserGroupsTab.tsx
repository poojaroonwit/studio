"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { UserGroup, PlatformModuleId } from '@/lib/types';
import { PLATFORM_MODULES } from '@/lib/types';
import { PlusCircle, Edit3, Trash2, Save, Loader2, ServerCrash, ShieldAlert, Users, ShieldCheck, Settings2, X, MoreHorizontal, Info } from 'lucide-react';
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

const platformModuleIds = PLATFORM_MODULES.map(m => m.id) as [PlatformModuleId, ...PlatformModuleId[]];

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().optional().nullable(),
  permissions: z.array(z.enum(platformModuleIds)).optional().default([]),
  is_default: z.boolean().optional().default(false),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

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

  const handleSelectRole = (role: UserGroup) => {
    setSelectedRole(role);
    setIsUnifiedDrawerOpen(true);
  };

  const handleOpenModal = (role: UserGroup | null = null) => {
    setEditingRole(role);
    form.reset(role ? { name: role.name, description: role.description || '', permissions: role.permissions || [], is_default: role.is_default || false } : { name: '', description: '', permissions: [], is_default: false });
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
        <Button onClick={() => fetchRoles()} className="btn-hover-primary-gradient">Try Again</Button>
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
        {(session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('USERS_MANAGE')) && (
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
             {(session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('USERS_MANAGE')) && (
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
               {roles.map((role) => (
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
                        {role.permissions?.length || 0} permissions
                      </span>
                    </TableCell>
                                       <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {(role as any).memberCount ?? role.user_count ?? 0} users
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                     <Button variant="ghost" size="sm" className="h-8 px-3">
                       Manage
                     </Button>
                   </TableCell>
                 </TableRow>
               ))}
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
                      {PLATFORM_MODULES.map((module) => (
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
                                    onCheckedChange={(checked) => {
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
                      ))}
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
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => { if(!open) setRoleToDelete(null);}}>
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
