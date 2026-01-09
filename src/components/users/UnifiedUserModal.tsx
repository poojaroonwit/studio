"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, User, UserPlus, Lock, Shield, Palette, Users, Edit3, RefreshCw, Search, Check, ChevronsUpDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
import { CustomFieldEdit } from '@/components/candidates/CustomFieldEdit';

// New Imports for Preferences and 2FA
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { CardCustomizationSettings } from '@/components/tasks/CardCustomizationSettings';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import {
  Layout,
  ShieldCheck,
  Filter,
  RotateCcw,
  Settings,
  Globe,
  AlertCircle,
  Database,
  Cloud,
  LayoutGrid
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label as UILabel } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { UserPreferences, TaskBoardPreferences, SidebarPreferences, AppearancePreferences, PositionsPreferences } from '@/hooks/use-user-preferences';



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
  positionTitle: z.string().optional().nullable(),
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
  const [customFields, setCustomFields] = useState<{ [fieldCode: string]: any }>({});
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<any[]>([]);
  const [isLookingUpAD, setIsLookingUpAD] = useState(false);
  const [teamSearchOpen, setTeamSearchOpen] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isPrefsLoading, setIsPrefsLoading] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);

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
      positionTitle: '',
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
      setTeamSearchOpen(false);
      setTeamSearchQuery('');
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
  const canForcePasswordChange = hasUserManagePermission && mode === 'edit' && user?.id !== session?.user?.id;
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
            positionTitle: user.positionTitle || '',
          });
          // Load custom fields if they exist
          if (user.customFields) {
            setCustomFields(user.customFields);
          } else {
            setCustomFields({});
          }
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
          positionTitle: '',
        });
        setCustomFields({});
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

  // Load preferences when modal opens
  useEffect(() => {
    const loadPreferences = async () => {
      if (!isOpen || !user?.id) return;
      setIsPrefsLoading(true);
      try {
        // Use the appropriate API based on whether we're editing self or another user
        const endpoint = (mode === 'profile' || user.id === session?.user?.id)
          ? '/api/user-preferences'
          : `/api/user-preferences/${user.id}`;

        const res = await fetch(endpoint, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPreferences(data);
          if (data.sidebar) {
            setSidebarShowAssigned(Boolean(data.sidebar.showAssignedPositions));
          }
        }
      } catch (e) {
        console.error('Failed to load user preferences:', e);
      } finally {
        setIsPrefsLoading(false);
      }
    };
    loadPreferences();
  }, [isOpen, mode, user?.id, session?.user?.id]);

  const updatePreferenceInDB = async (modelType: string, updates: any) => {
    try {
      const endpoint = (mode === 'profile' || user?.id === session?.user?.id)
        ? '/api/user-preferences'
        : `/api/user-preferences/${user?.id}`;

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ modelType, updates })
      });

      // Update local state
      setPreferences(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [modelType]: { ...prev[modelType as keyof UserPreferences], ...updates }
        };
      });
    } catch (e) {
      toast.error('Failed to save preference');
    }
  };

  const handleResetPreference = async (modelType: string) => {
    try {
      const endpoint = (mode === 'profile' || user?.id === session?.user?.id)
        ? `/api/user-preferences?modelType=${modelType}`
        : `/api/user-preferences/${user?.id}?modelType=${modelType}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.promise(Promise.resolve(), {
          loading: 'Resetting...',
          success: 'Preferences reset to defaults',
          error: 'Failed to reset preferences',
        });

        // Reload preferences
        const reloadRes = await fetch(endpoint.split('?')[0], { credentials: 'include' });
        if (reloadRes.ok) {
          const newData = await reloadRes.json();
          setPreferences(newData);
        }
      }
    } catch (error) {
      toast.error('Error resetting preferences');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/2fa', { method: 'DELETE' });
      if (res.ok) {
        toast.success('2FA disabled successfully');
        // Refresh page or update local user state if possible
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      toast.error('Error disabling 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSidebarPref = async (checked: boolean) => {
    setSidebarShowAssigned(checked);
    await updatePreferenceInDB('sidebar', { showAssignedPositions: checked });
  };

  const handleCustomFieldChange = (fieldCode: string, value: any) => {
    setCustomFields(prev => ({
      ...prev,
      [fieldCode]: value
    }));
  };

  // Fetch custom field definitions to determine if Additional Information section should be shown
  useEffect(() => {
    const fetchCustomFieldDefinitions = async () => {
      if (!isOpen) return;
      try {
        const response = await fetch('/api/settings/custom-fields?model=User&section=personal');
        if (response.ok) {
          const fields = await response.json();
          setCustomFieldDefinitions(fields || []);
        } else {
          setCustomFieldDefinitions([]);
        }
      } catch (err) {
        console.error('Failed to fetch custom field definitions:', err);
        setCustomFieldDefinitions([]);
      }
    };
    fetchCustomFieldDefinitions();
  }, [isOpen]);

  const handleLookupAzureAD = async () => {
    const email = form.getValues('email');
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address first');
      return;
    }

    setIsLookingUpAD(true);
    try {
      const response = await fetch(`/api/users/lookup-ad?email=${encodeURIComponent(email)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('User not found in Azure AD');
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Failed to lookup user' }));
          toast.error(errorData.message || 'Failed to lookup user in Azure AD');
        }
        return;
      }

      const adUser = await response.json();

      // Populate form fields with AD data
      if (adUser.displayName) {
        form.setValue('name', adUser.displayName);
      }

      // Set authentication method to Azure if user is found (only for create/edit, not profile)
      if (mode !== 'profile') {
        form.setValue('authenticationMethod', 'azure');
      }

      // Store job title and department in custom fields
      const updatedCustomFields = { ...customFields };
      if (adUser.jobTitle) {
        form.setValue('positionTitle', adUser.jobTitle);
        // Map to custom fields for backward compatibility/other displays
        updatedCustomFields['POSITION'] = adUser.jobTitle;
        updatedCustomFields['JOB_TITLE'] = adUser.jobTitle;
      }
      if (adUser.department) {
        updatedCustomFields['DEPARTMENT'] = adUser.department;
      }
      if (adUser.officeLocation) {
        updatedCustomFields['OFFICE_LOCATION'] = adUser.officeLocation;
      }
      if (adUser.mobilePhone) {
        updatedCustomFields['MOBILE_PHONE'] = adUser.mobilePhone;
      }

      setCustomFields(updatedCustomFields);

      toast.success(`User data loaded from Azure AD${adUser.jobTitle ? ` - ${adUser.jobTitle}` : ''}`);
    } catch (error) {
      console.error('Error looking up Azure AD user:', error);
      toast.error('Failed to lookup user in Azure AD');
    } finally {
      setIsLookingUpAD(false);
    }
  };

  const onSubmit = async (data: UnifiedUserFormValues) => {
    console.log('Form submission data:', data);
    await handleProtectedAsyncClick(async () => {
      setIsLoading(true);
      try {
        // Include custom fields in the data
        const dataWithCustomFields = {
          ...data,
          customFields: customFields
        };

        if (mode === 'create' && onAddUser) {
          await onAddUser(dataWithCustomFields as any);
        } else if (mode === 'edit' && onEditUser && user) {
          await onEditUser(user.id, dataWithCustomFields as any);
        } else if (mode === 'profile' && onSave) {
          await onSave(dataWithCustomFields as any);
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
      <DialogContent className="sm:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden" dialogId="unified-user-modal">
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

                  {(mode === 'profile' || (mode === 'edit' && user)) && (
                    <div
                      onClick={() => setActiveTab('preferences')}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer rounded-lg",
                        activeTab === 'preferences'
                          ? "text-primary bg-primary/10 border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      Preferences
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

                            {/* Name and Email Inputs - Changed to 1-column */}
                            <div className="flex-1 space-y-4 max-w-2xl">
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
                                      <div className="flex gap-2">
                                        <Input
                                          id="email-edit"
                                          type="email"
                                          placeholder="user@example.com"
                                          className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                          {...field}
                                        />
                                        {(mode === 'create' || mode === 'edit' || mode === 'profile') && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleLookupAzureAD}
                                            disabled={isLookingUpAD || !field.value || !field.value.includes('@')}
                                            title="Lookup user in Azure AD"
                                          >
                                            {isLookingUpAD ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <RefreshCw className="h-4 w-4" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                    {(mode === 'create' || mode === 'edit' || mode === 'profile') && (
                                      <p className="text-xs text-muted-foreground">
                                        Click the refresh icon to fetch user data from Azure AD (name, job title, department, etc.)
                                      </p>
                                    )}
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="positionTitle"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel htmlFor="position-title-edit" className="text-sm font-medium">
                                      Position Title
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        id="position-title-edit"
                                        placeholder="e.g. Senior Recruiter"
                                        className="h-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                        {...field}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground">
                                      This title will be shown in evaluation reports and interviewer selection.
                                    </p>
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
                            render={({ field }) => {
                              const selectedTeam = field.value?.length
                                ? userTeams.find(t => t.id === field.value[0])
                                : null;

                              const filteredTeams = userTeams.filter(team =>
                                team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
                              );

                              return (
                                <FormItem className="flex flex-col">
                                  <Popover open={teamSearchOpen} onOpenChange={setTeamSearchOpen}>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={teamSearchOpen}
                                          className={cn(
                                            "h-10 w-full justify-between transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                                            !selectedTeam && "text-muted-foreground"
                                          )}
                                          disabled={mode === 'profile'}
                                        >
                                          {selectedTeam ? (
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-3 h-3 rounded-full border border-slate-300"
                                                style={{ backgroundColor: selectedTeam.color || '#3B82F6' }}
                                              />
                                              {selectedTeam.name}
                                            </div>
                                          ) : (
                                            "Select a team"
                                          )}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                      <Command>
                                        <CommandInput
                                          placeholder="Search teams..."
                                          value={teamSearchQuery}
                                          onValueChange={setTeamSearchQuery}
                                        />
                                        <CommandList>
                                          <CommandEmpty>No teams found.</CommandEmpty>
                                          <CommandGroup>
                                            {filteredTeams.map((team) => (
                                              <CommandItem
                                                key={team.id}
                                                value={team.name}
                                                onSelect={() => {
                                                  field.onChange([team.id]);
                                                  setTeamSearchOpen(false);
                                                  setTeamSearchQuery('');
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value?.includes(team.id) ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                <div className="flex items-center gap-2">
                                                  <div
                                                    className="w-3 h-3 rounded-full border border-slate-300"
                                                    style={{ backgroundColor: team.color || '#3B82F6' }}
                                                  />
                                                  {team.name}
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </div>
                      </div>

                      {/* Custom Fields - Only show if there are custom field definitions */}
                      {customFieldDefinitions.length > 0 && (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Edit3 className="h-5 w-5 text-primary" />
                              Additional Information
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Custom fields and additional user details
                            </p>
                          </div>
                          <CustomFieldEdit
                            modelName="User"
                            section="personal"
                            entityId={user?.id || 'temp-new-user'}
                            customFields={customFields}
                            onFieldChange={handleCustomFieldChange}
                            title=""
                            className=""
                          />
                        </div>
                      )}
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
                        <div className="space-y-6 max-w-2xl">
                          <div className="grid grid-cols-1 gap-6">
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
                                      <SelectContent selectId="unified-user-role-select">
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
                                    <SelectContent selectId="unified-user-auth-type-select">
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
                        <div className="space-y-6 max-w-2xl">
                          {/* 2FA Section - New Implementation */}
                          <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Two-Factor Authentication
                              </CardTitle>
                              <CardDescription>
                                Add an extra layer of security to your account.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm">
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold flex items-center gap-2">
                                    Status:
                                    {user?.twoFactorEnabled ? (
                                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">Enabled</Badge>
                                    ) : (
                                      <Badge variant="secondary">Disabled</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground max-w-[300px]">
                                    {user?.twoFactorEnabled
                                      ? `Codes are currently being sent via ${user.twoFactorMethod || 'auth app'}.`
                                      : 'Enhance your security by enabling 2FA for your account.'}
                                  </p>
                                </div>

                                {isEditingSelf ? (
                                  user?.twoFactorEnabled ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                                      onClick={handleDisable2FA}
                                    >
                                      Disable 2FA
                                    </Button>
                                  ) : (
                                    !show2FASetup && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setShow2FASetup(true)}
                                      >
                                        Enable 2FA
                                      </Button>
                                    )
                                  )
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">2FA must be managed by the user</p>
                                )}
                              </div>

                              {show2FASetup && isEditingSelf && (
                                <div className="mt-4 border-t pt-4">
                                  <TwoFactorSetup onComplete={() => {
                                    setShow2FASetup(false);
                                    // Normally we reload or update state here
                                    window.location.reload();
                                  }} />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 w-full text-xs"
                                    onClick={() => setShow2FASetup(false)}
                                  >
                                    Cancel Setup
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-medium">Authentication Configuration</h4>
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

                                {canForcePasswordChange && (
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
                              <div className="flex items-center justify-center h-32 text-muted-foreground border rounded-lg bg-muted/30">
                                <div className="text-center">
                                  <Lock className="h-8 w-8 mx-auto mb-2 opacity-50 text-primary" />
                                  <p className="text-sm">Security settings are only available for Basic authentication</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                )}

                {activeTab === 'preferences' && preferences && (
                  <ScrollArea className="h-full">
                    <div className="p-8">
                      <div className="max-w-2xl mx-auto space-y-8">
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                          <div className="space-y-6">
                            <Card className="p-6">
                              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                                <Palette className="h-4 w-4 text-primary" />
                                Theme
                              </h4>
                              <ThemeSelector
                                themePreference={preferences.appearance?.themePreference || 'system'}
                                onThemeChange={(themePreference) => updatePreferenceInDB('appearance', { themePreference })}
                              />
                            </Card>

                            <Card className="p-6">
                              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                Personal Color
                              </h4>
                              <div className="flex items-center gap-4">
                                <PersonalColorPicker
                                  personalColor={form.watch('personalColor') || '#3B82F6'}
                                  onColorChange={(color) => {
                                    form.setValue('personalColor', color);
                                    updatePreferenceInDB('appearance', { personalColor: color });
                                  }}
                                />
                                <div className="text-sm text-muted-foreground">
                                  This color will be used for your avatar and personal indicators.
                                </div>
                              </div>
                            </Card>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-semibold mb-4">Sidebar</h3>
                          <Card className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                  <Layout className="h-4 w-4 text-primary" />
                                  Show Assigned Positions
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Display only positions that are assigned to you in the sidebar.
                                </p>
                              </div>
                              <Switch
                                checked={sidebarShowAssigned}
                                onCheckedChange={(checked) => {
                                  setSidebarShowAssigned(checked);
                                  updatePreferenceInDB('sidebar', { showAssignedPositions: checked });
                                }}
                              />
                            </div>
                          </Card>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-semibold mb-4">Task Board</h3>
                          <Card className="p-6">
                            <CardCustomizationSettings
                              preferences={preferences.taskBoard}
                              onUpdatePreferences={(updates) => updatePreferenceInDB('taskBoard', updates)}
                              onResetPreferences={() => handleResetPreference('taskBoard')}
                            />
                          </Card>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-semibold mb-4">Positions</h3>
                          <Card className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                  <RotateCcw className="h-4 w-4 text-primary" />
                                  Reset Positions Preferences
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Clear saved filters and sorting settings for the positions table.
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetPreference('positions')}
                              >
                                Reset Positions
                              </Button>
                            </div>
                          </Card>
                        </div>

                        <Separator />

                        <div className="pt-4 flex justify-between items-center">
                          <div className="text-sm text-muted-foreground italic">
                            All changes except Task Board settings are saved automatically.
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              if (confirm('Are you sure you want to reset ALL your preferences to defaults?')) {
                                await handleResetPreference('taskBoard');
                                await handleResetPreference('positions');
                                await handleResetPreference('appearance');
                                await handleResetPreference('sidebar');
                                toast.success('All preferences have been reset');
                              }
                            }}
                          >
                            Reset All Preferences
                          </Button>
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
                      <Loader2 className="animate-spin mr-2" />
                    ) : mode === 'create' ? (
                      <UserPlus className="mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
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






