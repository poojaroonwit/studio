"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, Loader2, RotateCcw, User, Shield, Lock, UserPlus, Edit3, Edit, Palette, Mail, X, Check, AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfile, UserGroup } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { UserAvatarUpload } from '@/components/ui/user-avatar-upload';
import { PersonalColorPicker } from '@/components/settings/PersonalColorPicker';
import { Switch } from '@/components/ui/switch';
import { hasAnyPermission } from '@/lib/permissions';




// Unified form schema that handles all scenarios
const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").optional().or(z.literal('')),
  role: z.string().min(1, "Role is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional().or(z.literal('')),
  forcePasswordChange: z.boolean().optional().default(false),
  authenticationMethod: z.enum(['basic', 'azure']).optional().default('basic'),
  avatarUrl: z.string().optional(),
  personalColor: z.string().optional(),
  userTeamIds: z.array(z.string()).optional().default([]),
  userGroupIds: z.array(z.string()).optional().default([]),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
export type ModalMode = 'create' | 'edit' | 'profile';

interface RedesignedUserModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: ModalMode;
  user?: UserProfile | null;
  onSave: (data: UserFormValues) => Promise<void>;
  onEditUser?: (userId: string, data: UserFormValues) => Promise<void>;
  onAddUser?: (data: UserFormValues) => Promise<void>;
}

// Header Component
interface ModalHeaderProps {
  modalInfo: { title: string; description: string; icon: any };
  onClose: () => void;
}

function ModalHeader({ modalInfo, onClose }: ModalHeaderProps) {
  const IconComponent = modalInfo.icon;
  
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 mb-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
          <IconComponent className="h-6 w-6 text-white" />
        </div>
        <div>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {modalInfo.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {modalInfo.description}
          </DialogDescription>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Tab Navigation Component
interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'account', label: 'Account Settings', icon: Shield },
  ];

  return (
    <div className="w-48 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <div className="p-3 space-y-1.5 mt-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative w-full rounded-lg text-left",
              activeTab === tab.id
                ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <tab.icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-left">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Personal Info Tab Content
interface PersonalInfoContentProps {
  form: any;
  user?: UserProfile | null;
  mode: ModalMode;
  userTeams: Array<{ id: string; name: string; color?: string }>;
}

function PersonalInfoContent({ form, user, mode, userTeams }: PersonalInfoContentProps) {
  return (
    <div className="space-y-6">
      {/* Profile Photo and Basic Info Row */}
      <div className="flex items-start gap-6">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          <FormField 
            control={form.control} 
            name="avatarUrl" 
            render={({ field }: any) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Profile Picture
                </FormLabel>
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
              </FormItem>
            )}
          />
        </div>

        {/* Name and Email Inputs */}
        <div className="flex-1 space-y-4">
          <FormField 
            control={form.control} 
            name="name" 
            render={({ field }: any) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter full name" 
                    className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
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
            render={({ field }: any) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="user@example.com" 
                    className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
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
          render={({ field }: any) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Initial Password <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Enter initial password" 
                  className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                User will be required to change this password on first login.
              </p>
            </FormItem>
          )}
        />
      )}

      {/* Personal Color */}
      <div className="space-y-3">
       
        <FormField 
          control={form.control} 
          name="personalColor" 
          render={({ field }: any) => (
            <FormItem>
              <FormControl>
                <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  <PersonalColorPicker
                    personalColor={field.value}
                    onColorChange={field.onChange}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* User Teams */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">User Teams</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Assign user to teams for better organization
          </p>
        </div>
        <FormField 
          control={form.control} 
          name="userTeamIds" 
          render={({ field }: any) => (
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
                >
                  <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent className="z-[100003]">
                    {userTeams.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: group.color || '#3B82F6' }}
                          />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// Account Settings Tab Content
interface AccountSettingsContentProps {
  form: any;
  mode: ModalMode;
  canManageAuthentication: boolean;
  canForcePasswordChange: boolean;
}

function AccountSettingsContent({ form, mode, canManageAuthentication, canForcePasswordChange }: AccountSettingsContentProps) {
  const [sidebarShowAssigned, setSidebarShowAssigned] = useState<boolean>(false);
  const [sidebarPrefLoading, setSidebarPrefLoading] = useState<boolean>(false);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

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

  useEffect(() => {
    const loadSidebarPref = async () => {
      setSidebarPrefLoading(true);
      try {
        // In profile mode, affect current user; in edit mode, this modal edits another user via admin context
        if (mode === 'profile') {
          const res = await fetch('/api/user-preferences', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setSidebarShowAssigned(Boolean(data?.sidebar?.showAssignedPositions));
          }
        } else {
          // For simplicity, keep disabled state unless admin flow is implemented at this modal scope
          // The switch will still render and save to current user when acting on own profile
        }
      } catch (e) {
        // ignore
      } finally {
        setSidebarPrefLoading(false);
      }
    };
    loadSidebarPref();
  }, [mode]);

  const saveSidebarPref = async (checked: boolean) => {
    try {
      setSidebarShowAssigned(checked);
      if (mode === 'profile') {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ modelType: 'sidebar', updates: { showAssignedPositions: checked } })
        });
      }
    } catch (e) {
      setSidebarShowAssigned(prev => prev);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField 
          control={form.control} 
          name="userGroupIds" 
          render={({ field }: any) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                System Role <span className="text-red-500">*</span>
              </FormLabel>
              {mode === 'profile' ? (
                <div className="h-11 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center">
                  {userGroups.find(g => g.id === field.value?.[0])?.name || 'No role assigned'}
                </div>
              ) : (
                <Select
                  value={field.value?.length ? field.value[0] : ""}
                  onValueChange={(value) => {
                    if (value) {
                      field.onChange([value]);
                    } else {
                      field.onChange([]);
                    }
                  }}
                  disabled={isLoadingGroups}
                >
                  <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="z-[100003]">
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
        
        {/* Sidebar preferences (Recruiter only) */}
        {(() => {
          const selectedRole = userGroups.find(g => g.id === form.watch('userGroupIds')?.[0]);
          const isRecruiter = selectedRole?.name === 'Recruiters' || selectedRole?.name === 'Recruiter';
          return isRecruiter && (
            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FormLabel className="text-sm font-medium">Show Assigned Positions</FormLabel>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Show this user's open assigned positions in the main sidebar.</p>
                </div>
                <Switch
                  checked={sidebarShowAssigned}
                  onCheckedChange={(c) => saveSidebarPref(Boolean(c))}
                  disabled={sidebarPrefLoading || mode !== 'profile'}
                />
              </div>
            </div>
          );
        })()}

        {canManageAuthentication && (
          <FormField 
            control={form.control} 
            name="authenticationMethod" 
            render={({ field }: any) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Authentication Method
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={mode === 'profile'}>
                  <FormControl>
                    <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select authentication method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[100003]">
                    <SelectItem value="basic">Basic (Email/Password)</SelectItem>
                    <SelectItem value="azure">Azure AD</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} 
          />
        )}
      </div>

      {form.watch('authenticationMethod') === 'basic' && (
        <div className="space-y-4">
          {(mode === 'edit' || mode === 'profile') && (
            <FormField 
              control={form.control} 
              name="newPassword" 
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    New Password
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter new password (leave blank to keep current)" 
                      className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {canForcePasswordChange && mode === 'edit' && (
            <FormField 
              control={form.control} 
              name="forcePasswordChange" 
              render={({ field }: any) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Force Password Change
                    </FormLabel>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      User will be required to change this password on next login.
                    </p>
                  </div>
                </FormItem>
              )} 
            />
          )}
        </div>
      )}
    </div>
  );
}



// Footer Component
interface ModalFooterProps {
  form: any;
  isSubmitting: boolean;
  isLoading: boolean;
  mode: ModalMode;
  onClose: () => void;
}

function ModalFooter({ form, isSubmitting, isLoading, mode, onClose }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : mode === 'create' ? (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Main Modal Component
export function RedesignedUserModal({ 
  isOpen, 
  onOpenChange, 
  mode, 
  user, 
  onSave, 
  onEditUser, 
  onAddUser 
}: RedesignedUserModalProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [userTeams, setUserTeams] = useState<Array<{ id: string; name: string; color?: string }>>([]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      password: '',
      role: 'Recruiter', 
      newPassword: '', 
      forcePasswordChange: false, 
      authenticationMethod: 'basic', 
      avatarUrl: '', 
      personalColor: '#3B82F6',
      userTeamIds: [],
      userGroupIds: [],
      
    },
  });

  // Watch the avatarUrl field to see if it's being updated
  const watchedAvatarUrl = form.watch('avatarUrl');

  const { isSubmitting } = form.formState;

  // Check permissions
  const canManageUsers = hasAnyPermission(session?.user, ['USERS_EDIT']);
  const canForcePasswordChange = hasAnyPermission(session?.user, ['USERS_EDIT']);
  const canManageAuthentication = hasAnyPermission(session?.user, ['USERS_EDIT']);

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchUserTeams = async () => {
        try {
          const response = await fetch('/api/settings/user-teams');
          if (response.ok) {
            const teams = await response.json();
            setUserTeams(teams);
          }
        } catch (error) {
          // Error fetching user groups
        }
      };
      
      fetchUserTeams();

      if (mode === 'edit' || mode === 'profile') {
        if (user) {
                  form.reset({
          name: user.name,
          email: user.email,
          role: user.role, // Keep for backward compatibility
          newPassword: '',
          forcePasswordChange: false,
          authenticationMethod: user.authenticationMethod || 'basic',
          avatarUrl: user.avatarUrl || '',
          personalColor: user.personalColor || '#3B82F6',
          userTeamIds: user.userTeamId ? [user.userTeamId] : [],
          userGroupIds: user.userGroupId ? [user.userGroupId] : [],
        });
        }
      } else {
        // Create mode - reset to defaults
        form.reset({
          name: '',
          email: '',
          password: '',
          role: '', // Keep for backward compatibility
          newPassword: '',
          forcePasswordChange: false,
          authenticationMethod: 'basic',
          avatarUrl: '',
          personalColor: '#3B82F6',
          userTeamIds: [],
          userGroupIds: [],
        });
      }
      setActiveTab('personal');
    }
  }, [isOpen, user, mode, form]);

  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'create' && onAddUser) {
        await onAddUser(data);
      } else if (mode === 'edit' && onEditUser && user) {
        await onEditUser(user.id, data);
      } else if (mode === 'profile' && onSave) {
        await onSave(data);
      }
    } catch (error) {
      toast.error('Failed to save user data');
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoContent form={form} user={user} mode={mode} userTeams={userTeams} />;
      case 'account':
        return (
                          <AccountSettingsContent 
                  form={form} 
                  mode={mode} 
                  canManageAuthentication={canManageAuthentication} 
                  canForcePasswordChange={canForcePasswordChange}
                />
        );


      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-white dark:bg-slate-900 gap-0 flex flex-col">
        {/* Header */}
        <ModalHeader modalInfo={modalInfo} onClose={() => onOpenChange(false)} />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            {/* Content */}
            <div className="flex-1 overflow-hidden flex mt-0 pt-0 min-h-0">
              {/* Tab Navigation */}
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-4">
                  {renderTabContent()}
                </ScrollArea>
              </div>
            </div>

            {/* Footer (full width) */}
            <ModalFooter 
              form={form}
              isSubmitting={isSubmitting}
              isLoading={isLoading}
              mode={mode}
              onClose={() => onOpenChange(false)}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
