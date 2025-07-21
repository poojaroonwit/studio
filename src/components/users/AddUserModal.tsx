"use client";

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserPlus, ShieldCheck, Users, Loader2, User, Settings, ChevronRight } from 'lucide-react';
import type { UserProfile, PlatformModuleId, UserGroup, PlatformModuleCategory, PlatformModule } from '@/lib/types';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check as CheckIcon } from 'lucide-react';
import { Separator } from '../ui/separator';
import { toast } from 'react-hot-toast';
import { RoleSelector } from '@/components/settings/RoleSelector';
import { RolePermissionSelector } from '@/components/settings/RolePermissionSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


const userRoleOptions: UserProfile['role'][] = ['Admin', 'Recruiter', 'Hiring Manager'];
const platformModuleIds = PLATFORM_MODULES.map(m => m.id) as [PlatformModuleId, ...PlatformModuleId[]];

const addUserFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(userRoleOptions as [UserProfile['role'], ...UserProfile['role'][]], { required_error: "Role is required" }),
  authenticationMethod: z.enum(['basic', 'azure']).default('basic'),
  forcePasswordChange: z.boolean().default(false),
  modulePermissions: z.array(z.enum(platformModuleIds)).optional().default([]),
  groupIds: z.array(z.string().uuid()).optional().default([]),
});

export type AddUserFormValues = z.infer<typeof addUserFormSchema>;

interface AddUserModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddUser: (data: AddUserFormValues) => Promise<void>;
}

const groupedPermissions: { category: PlatformModuleCategory, permissions: PlatformModule[] }[] =
  Object.values(PLATFORM_MODULE_CATEGORIES).map(category => ({
    category,
    permissions: PLATFORM_MODULES.filter(p => p.category === category) as PlatformModule[]
  }));

export function AddUserModal({ isOpen, onOpenChange, onAddUser }: AddUserModalProps) {
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [activeTab, setActiveTab] = useState('user-info');

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'Recruiter',
      authenticationMethod: 'basic',
      forcePasswordChange: false,
      modulePermissions: [],
      groupIds: [],
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: '',
        email: '',
        password: '',
        role: 'Recruiter',
        authenticationMethod: 'basic',
        forcePasswordChange: false,
        modulePermissions: [],
        groupIds: [],
      });
      setActiveTab('user-info');
      
      const fetchGroups = async () => {
        try {
          const response = await fetch('/api/settings/user-groups');
          if (!response.ok) {
            throw new Error('Failed to fetch user groups');
          }
          const data: UserGroup[] = await response.json();
          setAvailableGroups(data);
        } catch (error) {
          console.error("Error fetching groups:", error);
          toast.error("Could not load user groups for selection.");
        }
      };
      fetchGroups();
    } else {
        setAvailableGroups([]);
    }
  }, [isOpen, form, toast]);

  const onSubmit = async (data: AddUserFormValues) => {
    await onAddUser(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        form.reset();
        setAvailableGroups([]);
      }
    }}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center text-xl font-semibold">
                <UserPlus className="mr-3 h-5 w-5 text-primary" /> Add New User
              </DialogTitle>
              <DialogDescription className="text-base mt-2 text-muted-foreground">
                Create a new user account with appropriate permissions and group assignments
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              Step {['user-info', 'groups', 'permissions'].indexOf(activeTab) + 1} of 3
            </Badge>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
            {/* Content Area with Vertical Tabs */}
            <div className="flex-1 flex">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex">
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
                      value="groups" 
                      className="flex items-center gap-3 w-full justify-start px-4 py-3 h-auto text-left data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Users className="h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Group Assignment</span>
                        <span className="text-xs opacity-70">Assign roles</span>
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

                <div className="flex-1">
                  <TabsContent value="user-info" className="mt-0 h-full">
                    <Card className="border-0 shadow-none">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center text-lg">
                          <User className="mr-2 h-5 w-5 text-primary" />
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField 
                            control={form.control} 
                            name="name" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="name-add" className="text-sm font-medium">Full Name *</FormLabel>
                                <FormControl>
                                  <Input id="name-add" {...field} className="h-10" placeholder="Enter full name" />
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
                                <FormLabel htmlFor="email-add" className="text-sm font-medium">Email Address *</FormLabel>
                                <FormControl>
                                  <Input id="email-add" type="email" {...field} className="h-10" placeholder="user@example.com" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField 
                            control={form.control} 
                            name="password" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="password-add" className="text-sm font-medium">Password *</FormLabel>
                                <FormControl>
                                  <Input id="password-add" type="password" {...field} className="h-10" placeholder="Minimum 6 characters" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                          
                          <FormField 
                            control={form.control} 
                            name="role" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="role-add" className="text-sm font-medium">System Role *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger id="role-add" className="h-10">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {userRoleOptions.map(role => (
                                      <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField 
                            control={form.control} 
                            name="authenticationMethod" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel htmlFor="auth-method-add" className="text-sm font-medium">Authentication Method</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger id="auth-method-add" className="h-10">
                                      <SelectValue placeholder="Select authentication method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="basic">Basic (Email/Password)</SelectItem>
                                    <SelectItem value="azure">Azure AD</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                          
                          <FormField 
                            control={form.control} 
                            name="forcePasswordChange" 
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">Force password change on first login</FormLabel>
                              </FormItem>
                            )} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="groups" className="mt-0 h-full">
              
                        <div className="space-y-4">
                       
                          
                          <FormField 
                            control={form.control} 
                            name="groupIds" 
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <RoleSelector
                                    availableRoles={availableGroups}
                                    selectedRoleIds={field.value || []}
                                    onRolesChange={field.onChange}
                                    title="Role Assignment"
                                    description="Choose which roles should be assigned to this user."
                                    multiple={true}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>
                
                  </TabsContent>

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
                                    description="These are direct permissions. User also inherits permissions from assigned groups."
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>
                
                  </TabsContent>
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
                    size="lg"
                  >
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                    {form.formState.isSubmitting ? 'Adding User...' : 'Add User'}
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

