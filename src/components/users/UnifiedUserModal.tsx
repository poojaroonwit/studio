"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Loader2, User, UserPlus, Lock, Shield, Mail, Palette, Users, Edit3 } from 'lucide-react';
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
import { UserAvatarUpload } from '@/components/ui/user-avatar-upload';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';

const userRoleOptions: UserProfile['role'][] = ['Admin', 'Recruiter', 'Hiring Manager'];
const platformModuleIds = PLATFORM_MODULES.map(m => m.id);

// Unified form schema that handles all scenarios
const unifiedUserFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").optional().or(z.literal('')),
  role: z.enum(userRoleOptions as [UserProfile['role'], ...UserProfile['role'][]], { required_error: "Role is required" }),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional().or(z.literal('')),
  forcePasswordChange: z.boolean().optional().default(false),
  authenticationMethod: z.enum(['basic', 'azure']).optional().default('basic'),

  userTeamIds: z.array(z.string()).optional().default([]),
  modulePermissions: z.array(z.string()).optional().default([]),
  avatarUrl: z.string().optional(),
  personalColor: z.string().optional(),

});

export type UnifiedUserFormValues = z.infer<typeof unifiedUserFormSchema>;

export type ModalMode = 'create' | 'edit' | 'profile';

interface UnifiedUserModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: ModalMode;
  user?: UserProfile | null;
  onSave: (data: UnifiedUserFormValues) => Promise<void>;
  onEditUser?: (userId: string, data: UnifiedUserFormValues) => Promise<void>;
  onAddUser?: (data: UnifiedUserFormValues) => Promise<void>;
}

const groupedPermissions = Object.values(PLATFORM_MODULE_CATEGORIES).map(category => {
  try {
    // Defensive check to prevent filter errors
    if (!Array.isArray(PLATFORM_MODULES)) {
      console.warn('UnifiedUserModal: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
      return { category, permissions: [] };
    }
    
    const permissions = PLATFORM_MODULES.filter(p => {
      try {
        return p && p.category === category;
      } catch (error) {
        console.warn('UnifiedUserModal: Error filtering platform module:', error, p);
        return false;
      }
    });
    
    return { category, permissions };
  } catch (error) {
    console.error('UnifiedUserModal: Error creating grouped permissions:', error);
    return { category, permissions: [] };
  }
});

export function UnifiedUserModal({ 
  isOpen, 
  onOpenChange, 
  mode, 
  user, 
  onSave, 
  onEditUser, 
  onAddUser 
}: UnifiedUserModalProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('personal');
  const [userTeams, setUserTeams] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<UnifiedUserFormValues>({
    resolver: zodResolver(unifiedUserFormSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      password: '',
      role: 'Recruiter', 
      newPassword: '',  
      forcePasswordChange: false, 
      authenticationMethod: 'basic', 
      userTeamIds: [], 
      modulePermissions: [],
      avatarUrl: '', 
      personalColor: '#3B82F6',
    },
  });

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup modal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form and state when modal closes
      form.reset();
      setActiveTab('personal');
      setIsLoading(false);
      setUserTeams([]);
    }
  }, [isOpen, form]);

  const { isSubmitting } = form.formState;

  // Check permissions for different fields
  const isAdmin = session?.user?.role === 'Admin';
  const modulePermissions = session?.user?.modulePermissions || [];
  const hasUserManagePermission = modulePermissions.includes('USERS_VIEW') || modulePermissions.includes('USERS_CREATE') || modulePermissions.includes('USERS_EDIT') || modulePermissions.includes('USERS_DELETE') || modulePermissions.includes('USERS_PERMISSIONS_MANAGE');
  const isEditingSelf = user?.id === session?.user?.id;
  
  const canManageUsers = isAdmin || hasUserManagePermission;
  const canManageTeams = isAdmin || hasUserManagePermission;
  const canForcePasswordChange = isAdmin || hasUserManagePermission;
  const canManageAuthentication = isAdmin || hasUserManagePermission;

  // Load user data and teams when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' || mode === 'profile') {
        if (user) {
          form.reset({
            name: user.name,
            email: user.email,
            role: user.role,
            newPassword: '',
            forcePasswordChange: false,
            authenticationMethod: user.authenticationMethod || 'basic',
            userTeamIds: user.teams?.map(t => t.id) || [],
            modulePermissions: user.modulePermissions || [],
            avatarUrl: user.avatarUrl || '',
            personalColor: user.personalColor || '#3B82F6',

          });
        }
      } else {
        // Create mode - reset to defaults
        form.reset({
          name: '',
          email: '',
          password: '',
          role: 'Recruiter',
          newPassword: '',
          forcePasswordChange: false,
          authenticationMethod: 'basic',
          userTeamIds: [],
          modulePermissions: [],
          avatarUrl: '',
          personalColor: '#3B82F6',
          
        });
      }
      setActiveTab('personal');

      // Load available teams if user can manage teams or for profile mode (to show current teams)
      if (canManageTeams || mode === 'profile') {
        const fetchTeams = async () => {
          try {
            const response = await fetch('/api/settings/user-teams');
            if (!response.ok) throw new Error('Failed to fetch user teams');
            const data = await response.json();
            setUserTeams(data);
          } catch (error) {
            toast.error("Could not load user teams for selection.");
          }
        };
        fetchTeams();
      }
    }
  }, [isOpen, user, mode, form, canManageTeams]);

  const onSubmit = async (data: UnifiedUserFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'create' && onAddUser) {
        await onAddUser(data);
      } else if (mode === 'edit' && onEditUser && user) {
        await onEditUser(user.id, data);
      } else if (mode === 'profile' && onSave) {
        await onSave(data);
      }
      
      // Force a small delay to ensure the update is processed
      await new Promise(resolve => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(resolve, 100);
      });
      
    } catch (error) {
      toast.error('Failed to save user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine modal title and description based on mode
  const getModalInfo = () => {
    switch (mode) {
      case 'create':
        return {
          title: 'Add New User',
          description: 'Create a new user account with appropriate team assignments',
          icon: UserPlus,
        };
      case 'edit':
        return {
          title: `Edit User: ${user?.name || 'N/A'}`,
          description: 'Update user details, assign roles, and teams.',
          icon: Edit3,
        };
      case 'profile':
        return {
          title: 'Edit My Profile',
          description: 'Update your personal information and preferences.',
          icon: User,
        };
      default:
        return {
          title: 'User Management',
          description: 'Manage user information and settings.',
          icon: User,
        };
    }
  };

  const modalInfo = getModalInfo();
  const IconComponent = modalInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {modalInfo.title}
                </DialogTitle>
                <DialogDescription className="text-base mt-1 text-muted-foreground">
                  {modalInfo.description}
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSubmitting || isLoading}
                variant="default"
                className="flex items-center gap-2"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : mode === 'create' ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-hidden min-h-0">
              <div className="h-full flex min-h-0">
                {/* Vertical Tab Navigation - Left Side */}
                <div className="w-64 border-r border-border/50 flex-shrink-0">
                  <div className="p-4 space-y-2">
                    <div
                      onClick={() => setActiveTab('personal')}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-lg",
                        activeTab === 'personal'
                          ? "text-primary bg-primary/10 border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <User className="h-4 w-4" />
                      Personal Info
                    </div>
                    <div
                      onClick={() => setActiveTab('account')}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-lg",
                        activeTab === 'account'
                          ? "text-primary bg-primary/10 border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <Shield className="h-4 w-4" />
                      Account Settings
                    </div>
                    <div
                      onClick={() => setActiveTab('security')}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-lg",
                        activeTab === 'security'
                          ? "text-primary bg-primary/10 border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <Lock className="h-4 w-4" />
                      Security
                    </div>
                    {/* Permissions Tab - Only show for admin users editing their own profile */}
                    {isAdmin && isEditingSelf && (
                      <div
                        onClick={() => setActiveTab('permissions')}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-lg",
                          activeTab === 'permissions'
                            ? "text-primary bg-primary/10 border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        <Shield className="h-4 w-4" />
                        Permissions
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {activeTab === 'personal' && (
                    <ScrollArea className="h-full">
                      <div className="space-y-6 p-6">
                        {/* Personal Information */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <User className="h-5 w-5 text-primary" />
                              Personal Information
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Basic user details and profile settings
                            </p>
                          </div>
                          <div className="space-y-6">
                            {/* Profile Photo and Basic Info Row */}
                            <div className="flex items-start gap-6">
                              {/* Profile Photo */}
                              <div className="flex-shrink-0">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Profile Photo</h4>
                                  <FormField 
                                    control={form.control} 
                                    name="avatarUrl" 
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <UserAvatarUpload
                                            user={user || { id: '', name: '', email: '', avatarUrl: field.value }}
                                            onImageUpload={async (imageUrl) => {
                                              field.onChange(imageUrl);
                                            }}
                                            onImageRemove={async () => {
                                              field.onChange('');
                                            }}
                                            size="lg"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Name and Email Inputs */}
                              <div className="flex-1 space-y-4">
                                <FormField 
                                  control={form.control} 
                                  name="name" 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel htmlFor="name-edit" className="text-sm font-medium">
                                        Full Name <span className="text-destructive">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          id="name-edit"
                                          placeholder="Enter full name" 
                                          className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                          {...field} 
                                        />
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
                                      <FormLabel htmlFor="email-edit" className="text-sm font-medium">
                                        Email Address <span className="text-destructive">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          id="email-edit"
                                          type="email" 
                                          placeholder="user@example.com" 
                                          className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            {mode === 'create' && (
                              <FormField 
                                control={form.control} 
                                name="password" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="password-edit" className="text-sm font-medium">
                                      Initial Password <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        id="password-edit"
                                        type="password" 
                                        placeholder="Enter initial password" 
                                        className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-sm text-muted-foreground mt-2">
                                      User will be required to change this password on first login.
                                    </p>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>

                        {/* Profile Customization */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Palette className="h-5 w-5 text-primary" />
                              Profile Customization
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Personalize your profile appearance and preferences
                            </p>
                          </div>
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                              </div>
                              <FormField 
                                control={form.control} 
                                name="personalColor" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <PersonalColorPicker
                                        personalColor={field.value}
                                        onColorChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* User Teams */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Users className="h-5 w-5 text-primary" />
                              User Teams
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Assign user to teams for better organization
                            </p>
                          </div>
                          <div>
                            <FormField 
                              control={form.control} 
                              name="userTeamIds" 
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select
                                      value={field.value?.length ? field.value[0] : ""}
                                      onValueChange={(value) => {
                                        if (value) {
                                          field.onChange([value]);
                                        } else {
                                          field.onChange([]);
                                        }
                                      }}
                                      disabled={mode === 'profile'}
                                    >
                                      <SelectTrigger className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                                        <SelectValue placeholder="Select a team" />
                                      </SelectTrigger>
                                      <SelectContent className="z-[100003]">
                                        {userTeams.map((team) => (
                                          <SelectItem key={team.id} value={team.id}>
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full border border-slate-300"
                                                style={{ backgroundColor: team.color || '#3B82F6' }}
                                              />
                                              {team.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === 'account' && (
                    <ScrollArea className="h-full">
                      <div className="space-y-6 p-6">
                        {/* Account Configuration */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Shield className="h-5 w-5 text-primary" />
                              Account Configuration
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              System role and authentication settings
                            </p>
                          </div>
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <FormField 
                                control={form.control} 
                                name="role" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="role-edit" className="text-sm font-medium">
                                      System Role <span className="text-destructive">*</span>
                                    </FormLabel>
                                    {mode === 'profile' ? (
                                      <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted text-foreground flex items-center transition-all duration-200">
                                        {field.value || 'No role assigned'}
                                      </div>
                                    ) : (
                                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger id="role-edit" className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                                            <SelectValue placeholder="Select a role" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="z-[100003]">
                                          {userRoleOptions.map(roleValue => (
                                            <SelectItem key={roleValue} value={roleValue}>{roleValue}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField 
                                control={form.control} 
                                name="authenticationMethod" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="auth-method-edit" className="text-sm font-medium">
                                      Authentication Method
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={mode === 'profile'}>
                                      <FormControl>
                                        <SelectTrigger id="auth-method-edit" className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                                          <SelectValue placeholder="Select authentication method" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="z-[100003]">
                                        <SelectItem value="basic">Basic (Email/Password)</SelectItem>
                                        <SelectItem value="azure">Azure AD (SSO)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>


                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === 'security' && (
                    <ScrollArea className="h-full">
                      <div className="space-y-6 p-6">
                        {/* Security Settings */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Lock className="h-5 w-5 text-primary" />
                              Security Settings
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Password management and security configuration
                            </p>
                          </div>
                          <div className="space-y-6">
                            {form.watch('authenticationMethod') === 'basic' ? (
                              <>
                                {(mode === 'edit' || mode === 'profile') && (
                                  <FormField 
                                    control={form.control} 
                                    name="newPassword" 
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel htmlFor="new-password-edit" className="text-sm font-medium">
                                          New Password
                                        </FormLabel>
                                        <FormControl>
                                          <Input 
                                            id="new-password-edit"
                                            type="password" 
                                            placeholder="Enter new password (leave blank to keep current)" 
                                            className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-sm text-muted-foreground mt-2">
                                          Leave blank to keep the current password unchanged.
                                        </p>
                                      </FormItem>
                                    )}
                                  />
                                )}

                                {canForcePasswordChange && mode === 'edit' && (
                                  <FormField 
                                    control={form.control} 
                                    name="forcePasswordChange" 
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                          />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                          <FormLabel className="text-sm font-medium">
                                            Force Password Change
                                          </FormLabel>
                                          <p className="text-sm text-muted-foreground">
                                            User will be required to change this password on next login.
                                          </p>
                                        </div>
                                      </FormItem>
                                    )} 
                                  />
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <div className="text-center">
                                  <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p>Security settings are only available for Basic authentication</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === 'permissions' && isAdmin && isEditingSelf && (
                    <ScrollArea className="h-full">
                      <div className="space-y-6 p-6">
                        {/* Permissions Management */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Shield className="h-5 w-5 text-primary" />
                              Permission Management
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Manage your system permissions. Critical permissions are protected and cannot be removed.
                            </p>
                          </div>

                          {/* Security Notice */}
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                                  Protected Permissions
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                  The permissions <strong>USERS_MANAGE</strong> and <strong>USER_GROUPS_MANAGE</strong> are protected and cannot be removed from admin accounts for security reasons.
                                </p>
                              </div>
                            </div>
                          </div>

                          <FormField 
                            control={form.control} 
                            name="modulePermissions" 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  System Permissions
                                </FormLabel>
                                <div className="space-y-4">
                                  {groupedPermissions.map(({ category, permissions }) => (
                                    <div key={category} className="space-y-3">
                                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b pb-1">
                                        {category}
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {permissions.map((permission) => {
                                          const isProtected = ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_VIEW', 'USER_GROUPS_CREATE', 'USER_GROUPS_EDIT', 'USER_GROUPS_DELETE'].includes(permission.id);
                                          const isSelected = field.value?.includes(permission.id);
                                          
                                          return (
                                            <FormField
                                              key={permission.id}
                                              control={form.control}
                                              name="modulePermissions"
                                              render={({ field: permissionField }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                  <FormControl>
                                                    <Checkbox
                                                      checked={isSelected}
                                                      onCheckedChange={(checked) => {
                                                        if (isProtected && !checked) {
                                                          // Prevent unchecking protected permissions
                                                          return;
                                                        }
                                                        return checked
                                                          ? permissionField.onChange([...field.value, permission.id])
                                                          : permissionField.onChange(
                                                              field.value?.filter((value) => value !== permission.id)
                                                            );
                                                      }}
                                                      disabled={isProtected && isSelected}
                                                    />
                                                  </FormControl>
                                                  <div className="space-y-1 leading-none">
                                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                      {permission.label}
                                                      {isProtected && isSelected && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                                          Protected
                                                        </span>
                                                      )}
                                                    </FormLabel>
                                                    <p className="text-xs text-muted-foreground">
                                                      {permission.description}
                                                    </p>
                                                  </div>
                                                </FormItem>
                                              )}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </ScrollArea>
                  )}


                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 border-t bg-muted/20 flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="lg">Cancel</Button>
                </DialogClose>
                
                <div className="flex items-center gap-3">
                  <Button 
                    type="submit" 
                    variant="default"
                    disabled={isSubmitting || isLoading} 
                    className="btn-primary-gradient"
                    size="lg"
                  >
                    {isSubmitting || isLoading ? (
                      <Loader2 className="animate-spin mr-2"/>
                    ) : mode === 'create' ? (
                      <UserPlus className="mr-2 h-4 w-4"/>
                    ) : (
                      <Save className="mr-2 h-4 w-4"/>
                    )}
                    {isSubmitting || isLoading ? 'Saving...' : mode === 'create' ? 'Add User' : 'Save Changes'}
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
