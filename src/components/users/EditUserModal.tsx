"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Palette, ImageUp, Trash2, Loader2, XCircle, PenSquare, ServerCrash, ShieldAlert, Settings2, Wallpaper, Droplets, Type, Sidebar as SidebarIcon, RotateCcw, Eye, EyeOff, Monitor, Sun, Moon, Zap, StickyNote, Paintbrush, LayoutDashboard, Sidebar as SidebarMenuIcon, LogIn, Edit3, Users, ShieldCheck, ChevronsUpDown, User, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type { SystemSetting, LoginPageBackgroundType, SystemSettingKey, LoginPageLayoutType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfile, PlatformModuleId, UserGroup, PlatformModuleCategory } from '@/lib/types';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { RoleSelector } from '@/components/settings/RoleSelector';
import { RolePermissionSelector } from '@/components/settings/RolePermissionSelector';

const userRoleOptions: UserProfile['role'][] = ['Admin', 'Recruiter', 'Hiring Manager'];
const platformModuleIds = PLATFORM_MODULES.map(m => m.id) as [PlatformModuleId, ...PlatformModuleId[]];

const editUserFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(userRoleOptions as [UserProfile['role'], ...UserProfile['role'][]], { required_error: "Role is required" }),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional().or(z.literal('')),
  forcePasswordChange: z.boolean().optional().default(false),
  authenticationMethod: z.enum(['basic', 'azure']).optional().default('basic'),
  modulePermissions: z.array(z.enum(platformModuleIds)).optional().default([]),
  groupIds: z.array(z.string().uuid()).optional().default([]),
});

export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEditUser: (userId: string, data: EditUserFormValues) => Promise<void>;
  user: UserProfile | null;
  isSelfEdit?: boolean;
}

const groupedPermissions = Object.values(PLATFORM_MODULE_CATEGORIES).map(category => ({
  category,
  permissions: PLATFORM_MODULES.filter(p => p.category === category)
}));


export function EditUserModal({ isOpen, onOpenChange, onEditUser, user, isSelfEdit = false }: EditUserModalProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('user-info');
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { name: '', email: '', role: 'Recruiter', newPassword: '', forcePasswordChange: false, authenticationMethod: 'basic', modulePermissions: [], groupIds: [] },
  });

  // Check if current user has permission to force change passwords
  const canForcePasswordChange = session?.user?.role === 'Admin' || 
    session?.user?.modulePermissions?.includes('USERS_MANAGE');

  // Check if current user has permission to manage authentication methods
  const canManageAuthentication = session?.user?.role === 'Admin' || 
    session?.user?.modulePermissions?.includes('USERS_MANAGE');

  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        newPassword: '',
        forcePasswordChange: false,
        authenticationMethod: user.authenticationMethod || 'basic',
        modulePermissions: user.modulePermissions || [],
        groupIds: user.groups?.map(g => g.id) || [],
      });
      setActiveTab('user-info');

      if (!isSelfEdit) {
        const fetchGroups = async () => {
          try {
            const response = await fetch('/api/settings/user-groups');
            if (!response.ok) throw new Error('Failed to fetch user groups');
            const data: UserGroup[] = await response.json();
            setAvailableGroups(data);
          } catch (error) {
            console.error("Error fetching groups:", error);
            toast.error("Could not load user groups for selection.");
          }
        };
        fetchGroups();
      }
    } else if (!isOpen) {
      form.reset({ name: '', email: '', role: 'Recruiter', newPassword: '', forcePasswordChange: false, authenticationMethod: 'basic', modulePermissions: [], groupIds: [] });
      setAvailableGroups([]);
      setActiveTab('user-info');
    }
  }, [user, isOpen, form, toast, isSelfEdit]);

  const onSubmit = async (data: EditUserFormValues) => {
    if (!user) return;
    const payload: Partial<EditUserFormValues> = { ...data };
    if (!payload.newPassword) {
      delete payload.newPassword;
    }
    if (!payload.forcePasswordChange) {
      delete payload.forcePasswordChange;
    }
    if (isSelfEdit) {
      delete (payload as any).role;
      delete (payload as any).modulePermissions;
      delete (payload as any).groupIds;
      delete (payload as any).newPassword;
      delete (payload as any).forcePasswordChange;
      delete (payload as any).authenticationMethod;
    }
    await onEditUser(user.id, payload as EditUserFormValues);
  };

  if (!user && isOpen) return null;

  const dialogTitle = isSelfEdit ? "Edit My Profile" : `Edit User: ${user?.name || 'N/A'}`;
  const dialogDescription = isSelfEdit
    ? "Update your personal information. Use the Change Password function to update your password."
    : "Update user details, assign roles, groups, and permissions.";

  const getTotalSteps = () => isSelfEdit ? 1 : 2;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        form.reset({ name: '', email: '', role: 'Recruiter', newPassword: '', forcePasswordChange: false, authenticationMethod: 'basic', modulePermissions: [], groupIds: [] });
        setAvailableGroups([]);
        setActiveTab('user-info');
      }
    }}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center text-xl font-semibold">
                <Edit3 className="mr-3 h-5 w-5 text-primary" /> {dialogTitle}
              </DialogTitle>
              <DialogDescription className="text-base mt-2 text-muted-foreground">
                {dialogDescription}
              </DialogDescription>
            </div>
            {!isSelfEdit && (
              <Badge variant="secondary" className="text-sm">
                Step {['user-info', 'permissions'].indexOf(activeTab) + 1} of {getTotalSteps()}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
            {/* Content Area with Vertical Tabs */}
            <div className="flex-1 flex">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex">
                {!isSelfEdit && (
                  <div className="flex flex-col w-64 border-r bg-muted/20">
                    <TabsList className="flex flex-col h-auto w-full bg-transparent p-2 space-y-2">
                      <TabsTrigger 
                        value="user-info" 
                        className="flex items-center gap-3 w-full justify-start px-4 py-3 h-auto text-left data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <User className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">User Information</span>
                          <span className="text-xs opacity-70">Basic details</span>
                        </div>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="permissions" 
                        className="flex items-center gap-3 w-full justify-start px-4 py-3 h-auto text-left data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Permissions</span>
                          <span className="text-xs opacity-70">Direct access</span>
                        </div>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                )}

                <div className="flex-1 p-6">
                  <TabsContent value="user-info" className="mt-0 h-full">
                    <Card className="border-0 shadow-none">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center text-lg">
                          <User className="mr-2 h-5 w-5 text-primary" />
                          {isSelfEdit ? 'Profile Information' : 'Basic Information'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField 
                            control={form.control} 
                            name="name" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="name-edit" className="text-sm font-medium">Full Name *</FormLabel>
                                <FormControl>
                                  <Input id="name-edit" {...field} className="h-10" placeholder="Enter full name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                          
                          <FormField 
                            control={form.control} 
                            name="email" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="email-edit" className="text-sm font-medium">Email Address *</FormLabel>
                                <FormControl>
                                  <Input id="email-edit" type="email" {...field} className="h-10" placeholder="user@example.com" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>

                        {!isSelfEdit && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField 
                              control={form.control} 
                              name="role" 
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel htmlFor="role-edit" className="text-sm font-medium">System Role *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger id="role-edit" className="h-10">
                                        <SelectValue placeholder="Select a role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="z-[210]">
                                      {userRoleOptions.map(roleValue => (
                                        <SelectItem key={roleValue} value={roleValue}>{roleValue}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                  <p className="text-sm text-muted-foreground mt-2">
                                    This is the primary system role. Specific permissions are managed via groups and direct assignments.
                                  </p>
                                </FormItem>
                              )}
                            />
                            
                            {canManageAuthentication && (
                              <FormField 
                                control={form.control} 
                                name="authenticationMethod" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="auth-method-edit" className="text-sm font-medium">Authentication Method</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger id="auth-method-edit" className="h-10">
                                          <SelectValue placeholder="Select authentication method" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="z-[210]">
                                        <SelectItem value="basic">Basic (Email/Password)</SelectItem>
                                        <SelectItem value="azure">Azure AD</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    <p className="text-sm text-muted-foreground mt-2">
                                      Email address ({form.watch('email')}) will be used as the primary identifier for both authentication methods.
                                    </p>
                                  </FormItem>
                                )} 
                              />
                            )}
                          </div>
                        )}

                        {!isSelfEdit && canForcePasswordChange && form.watch('authenticationMethod') === 'basic' && (
                          <div className="space-y-4">
                            <FormField 
                              control={form.control} 
                              name="forcePasswordChange" 
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">Force password change on next login</FormLabel>
                                </FormItem>
                              )} 
                            />
                            
                            {form.watch('forcePasswordChange') && (
                              <FormField 
                                control={form.control} 
                                name="newPassword" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="password-edit" className="text-sm font-medium">New Password *</FormLabel>
                                    <FormControl>
                                      <Input 
                                        id="password-edit"
                                        type="password" 
                                        {...field} 
                                        placeholder="Enter new password (min 6 characters)" 
                                        className="h-10" 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-sm text-muted-foreground mt-1">
                                      This password will be set immediately and the user will be required to change it on next login.
                                    </p>
                                  </FormItem>
                                )} 
                              />
                            )}
                          </div>
                        )}
                        
                        {!isSelfEdit && !canForcePasswordChange && form.watch('authenticationMethod') === 'basic' && (
                          <FormField 
                            control={form.control} 
                            name="newPassword" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="password-edit" className="text-sm font-medium">New Password (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    id="password-edit"
                                    type="password" 
                                    {...field} 
                                    placeholder="Leave blank to keep current" 
                                    className="h-10" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {!isSelfEdit && (
                    <>


                      <TabsContent value="permissions" className="mt-0 h-full">
                      
                            <div className="space-y-4">
                          
                              
                              <FormField 
                                control={form.control} 
                                name="modulePermissions" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RolePermissionSelector
                                        selectedPermissions={field.value || []}
                                        onPermissionsChange={field.onChange}
                                        title="Direct Permissions"
                                        description="Grant specific permissions directly to this user, overriding group permissions."
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} 
                              />
                            </div>
                       
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>
            </div>
            
            <DialogFooter className="p-6 border-t bg-muted/20">
              <div className="flex items-center justify-between w-full">
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="lg">Cancel</Button>
                </DialogClose>
                
                <div className="flex items-center gap-3">
                  <Button 
                    type="submit" 
                    variant="default"
                    disabled={form.formState.isSubmitting} 
                    className="btn-primary-gradient"
                    size="lg"
                  >
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
