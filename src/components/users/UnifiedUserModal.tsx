"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, User, UserPlus, Lock, Shield, Palette, Users, Edit3 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { UserProfile, UserGroup } from '@/lib/types';
import { toast } from 'react-hot-toast';

import { UserAvatarUpload } from '@/components/ui/user-avatar-upload';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';
import { useClickProtection } from '@/hooks/use-click-protection';
import { Switch } from '@/components/ui/switch';
import { hasAnyPermission } from '@/lib/permissions';



// Unified form schema that handles all scenarios
const unifiedUserFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").optional().or(z.literal('')),
  role: z.string().min(1, "Role is required").optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional().or(z.literal('')),
  forcePasswordChange: z.boolean().optional().default(false),
  authenticationMethod: z.enum(['basic', 'azure']).optional().default('basic'),
  userTeamIds: z.array(z.string()).optional().default([]),
  userGroupIds: z.array(z.string()).optional().default([]),
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
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sidebarShowAssigned, setSidebarShowAssigned] = useState<boolean>(false);
  const [sidebarPrefLoading, setSidebarPrefLoading] = useState<boolean>(false);
  
  const { isActioning, handleProtectedAsyncClick } = useClickProtection({
    actionName: 'save user',
    debounceMs: 200,
    timeoutMs: 500
  });

  const form = useForm<UnifiedUserFormValues>({
    resolver: zodResolver(unifiedUserFormSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      password: '',
      role: '', 
      newPassword: '',  
      forcePasswordChange: false, 
      authenticationMethod: 'basic', 
      userTeamIds: [], 
      userGroupIds: [],
      avatarUrl: '', 
      personalColor: '#3B82F6',
    },
  });

  // Fetch user groups
  useEffect(() => {
    const fetchUserGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const response = await fetch('/api/settings/user-groups');
        if (response.ok) {
          const groups = await response.json();
          setUserGroups(groups);
        }
      } catch (error) {
        console.error('Failed to fetch user groups:', error);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchUserGroups();
  }, []);

  // Update form default values when user groups are loaded
  useEffect(() => {
    if (userGroups.length > 0 && mode === 'create' && isOpen) {
      // First try to find a group marked as default, then fall back to name-based selection
      const defaultGroup = userGroups.find(g => g.isDefault) || 
                          userGroups.find(g => g.name.toLowerCase().includes('recruiter')) || 
                          userGroups[0];
      
      if (defaultGroup) {
        form.setValue('userGroupIds', [defaultGroup.id]);
        // Map user group to role for API compatibility
        let roleString = 'Recruiter'; // default fallback
        if (defaultGroup.name.toLowerCase().includes('admin')) {
          roleString = 'Admin';
        } else if (defaultGroup.name.toLowerCase().includes('hiring') || defaultGroup.name.toLowerCase().includes('manager')) {
          roleString = 'Hiring Manager';
        } else if (defaultGroup.name.toLowerCase().includes('recruiter')) {
          roleString = 'Recruiter';
        }
        form.setValue('role', roleString);
        
        console.log('Set default user group:', defaultGroup.name, 'ID:', defaultGroup.id, 'Role:', roleString);
      }
    }
  }, [userGroups, mode, form, isOpen]);

  // Watch userGroupIds to update role field
  useEffect(() => {
    const watchedUserGroupIds = form.watch('userGroupIds');
    if (watchedUserGroupIds && watchedUserGroupIds.length > 0) {
      const selectedGroup = userGroups.find(g => g.id === watchedUserGroupIds[0]);
      if (selectedGroup) {
        // Map user group to role string for API compatibility
        let roleString = 'Recruiter'; // default
        if (selectedGroup.name.toLowerCase().includes('admin')) {
          roleString = 'Admin';
        } else if (selectedGroup.name.toLowerCase().includes('hiring') || selectedGroup.name.toLowerCase().includes('manager')) {
          roleString = 'Hiring Manager';
        } else if (selectedGroup.name.toLowerCase().includes('recruiter')) {
          roleString = 'Recruiter';
        }
        form.setValue('role', roleString);
      }
    }
  }, [form.watch('userGroupIds'), userGroups, form]);

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
  const modulePermissions = session?.user?.modulePermissions || [];
  
  const hasUserManagePermission = hasAnyPermission(session?.user, ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_PERMISSIONS_MANAGE']);
  const isEditingSelf = user?.id === session?.user?.id;
  
  const canManageUsers = hasUserManagePermission;
  const canManageTeams = hasUserManagePermission;
  const canForcePasswordChange = hasUserManagePermission;
  const canManageAuthentication = hasUserManagePermission;

  // Load user data and teams when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' || mode === 'profile') {
        if (user) {
          form.reset({
            name: user.name,
            email: user.email,
            role: user.role, // Keep for backward compatibility
            newPassword: '',
            forcePasswordChange: false,
            authenticationMethod: user.authenticationMethod || 'basic',
            userTeamIds: user.userTeamId ? [user.userTeamId] : [],
            userGroupIds: user.userGroupId ? [user.userGroupId] : [],
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
          role: 'Recruiter', // Use valid role value, not user group name
          newPassword: '',
          forcePasswordChange: false,
          authenticationMethod: 'basic',
          userTeamIds: [],
          userGroupIds: [], // Will be set by the userGroups useEffect
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

  // Load sidebar preference when modal opens and when role/user changes
  useEffect(() => {
    const loadSidebarPref = async () => {
      if (!isOpen) return;
      setSidebarPrefLoading(true);
      try {
        if ((mode === 'profile') || (user && user.id === session?.user?.id)) {
          const res = await fetch('/api/user-preferences', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setSidebarShowAssigned(Boolean(data?.sidebar?.showAssignedPositions));
          }
        } else if ((mode === 'edit') && user && hasAnyPermission(session?.user, ['USERS_EDIT', 'USERS_VIEW'])) {
          const res = await fetch(`/api/user-preferences/${user.id}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setSidebarShowAssigned(Boolean(data?.sidebar?.showAssignedPositions));
          }
        } else {
          setSidebarShowAssigned(false);
        }
      } catch (e) {
        // ignore
      } finally {
        setSidebarPrefLoading(false);
      }
    };
    loadSidebarPref();
  }, [isOpen, mode, user?.id, session?.user?.id, session?.user?.role]);

  const saveSidebarPref = async (checked: boolean) => {
    try {
      setSidebarShowAssigned(checked);
      if ((mode === 'profile') || (user && user.id === session?.user?.id)) {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ modelType: 'sidebar', updates: { showAssignedPositions: checked } })
        });
              } else if ((mode === 'edit') && user && hasUserManagePermission) {
        await fetch(`/api/user-preferences/${user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sidebar: { showAssignedPositions: checked } })
        });
      }
    } catch (e) {
      toast.error('Failed to save sidebar preference');
      setSidebarShowAssigned(prev => !checked ? prev : prev); // no-op rollback
    }
  };

  const onSubmit = async (data: UnifiedUserFormValues) => {
    console.log('Form submission data:', data);
    await handleProtectedAsyncClick(async () => {
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
    });
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
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex min-h-0">
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
                                name="userGroupIds" 
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="role-edit" className="text-sm font-medium">
                                      System Role <span className="text-destructive">*</span>
                                    </FormLabel>
                                    {mode === 'profile' ? (
                                      <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted text-foreground flex items-center transition-all duration-200">
                                        {(() => {
                                          // Use the same logic as the user management page
                                          // First try to find the user's group by ID, then fall back to role
                                          const userGroup = userGroups.find(g => g.id === field.value?.[0]);
                                          if (userGroup) {
                                            return userGroup.name;
                                          }
                                          
                                          // Fallback to the role from the form
                                          const currentRole = form.getValues('role');
                                          return currentRole || 'No role assigned';
                                        })()}
                                      </div>
                                    ) : (
                                      <Select
                                        value={field.value?.length ? field.value[0] : "none"}
                                        onValueChange={(value) => {
                                          if (value && value !== "none") {
                                            field.onChange([value]);
                                          } else {
                                            field.onChange([]);
                                          }
                                        }}
                                        disabled={isLoadingGroups}
                                      >
                                        <SelectTrigger className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                                          <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[100003]">
                                          {/* Clear option */}
                                          <SelectItem value="none">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <span>No role assigned</span>
                                            </div>
                                          </SelectItem>
                                          <div className="h-px bg-border my-1" />
                                          {userGroups.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                              <div className="flex items-center gap-2">
                                                {role.isSystemRole && (
                                                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                                    System
                                                  </Badge>
                                                )}
                                                {role.isDefault && (
                                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                                    Default
                                                  </Badge>
                                                )}
                                                <span>{role.name}</span>
                                              </div>
                                            </SelectItem>
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

                            {/* Sidebar preferences (Available for all users) */}
                            <div className="rounded-md border p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <Label className="text-sm font-medium">Show Assigned Positions</Label>
                                  <p className="text-sm text-muted-foreground">Show this user's open assigned positions in the main sidebar.</p>
                                </div>
                                <Switch
                                  checked={sidebarShowAssigned}
                                  onCheckedChange={(c) => saveSidebarPref(Boolean(c))}
                                  disabled={sidebarPrefLoading || mode !== 'profile'}
                                />
                              </div>
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






