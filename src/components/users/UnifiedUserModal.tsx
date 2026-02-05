"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, UserPlus, Save, Edit3, Check, Briefcase, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { toast } from 'react-hot-toast';

import { UserAvatarUpload } from '@/components/ui/user-avatar-upload';
import { useClickProtection } from '@/hooks/use-click-protection';
import { hasAnyPermission } from '@/lib/permissions';
import { UserProfile, UserGroup } from '@/lib/types';
import { UserPreferences } from '@/hooks/use-user-preferences';

import { HiringDetailTab } from './HiringDetailTab';
import { ProfileTab } from './unified-user-modal/ProfileTab';
import { SecurityTab } from './unified-user-modal/SecurityTab';
import { PreferencesTab } from './unified-user-modal/PreferencesTab';
import { UserManagementForm } from './unified-user-modal/UserManagementForm';
import {
  unifiedUserFormSchema,
  UnifiedUserFormValues,
  ModalMode
} from './unified-user-modal/types';


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
  const [customFields, setCustomFields] = useState<{ [fieldCode: string]: any }>({});
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<any[]>([]);
  const [isLookingUpAD, setIsLookingUpAD] = useState(false);

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
      authenticationMethods: ['basic'],
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

  // Check permissions
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
            authenticationMethods: user.authenticationMethods || ['basic'],
            userTeamIds: user.userTeamId ? [user.userTeamId] : [],
            userGroupIds: user.userGroupId ? [user.userGroupId] : [],
            avatarUrl: user.avatarUrl || '',
            personalColor: user.personalColor || '#3B82F6',
            positionTitle: user.positionTitle || '',
            department: user.department || '',
            phoneNumber: user.phoneNumber || '',
            officeLocation: user.officeLocation || '',
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
          role: 'Recruiter',
          newPassword: '',
          forcePasswordChange: false,
          authenticationMethods: ['basic'],
          userTeamIds: [],
          userGroupIds: [],
          avatarUrl: '',
          personalColor: '#3B82F6',
          positionTitle: '',
          department: '',
          phoneNumber: '',
          officeLocation: '',
        });
        setCustomFields({});
      }
      setActiveTab('personal');

      // Load available teams
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
      const res = await fetch('/api/auth/2fa/disable', { method: 'POST' });
      if (res.ok) {
        toast.success('2FA disabled successfully');
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

  // Fetch custom field definitions
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

    setIsLoading(true);
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

      const currentMethods = form.getValues('authenticationMethods') || [];
      if (!currentMethods.includes('azure_ad')) {
        form.setValue('authenticationMethods', [...currentMethods, 'azure_ad']);
      }

      // Store job title and department in custom fields
      const updatedCustomFields = { ...customFields };
      if (adUser.jobTitle) {
        form.setValue('positionTitle', adUser.jobTitle);
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
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: UnifiedUserFormValues) => {
    await handleProtectedAsyncClick(async () => {
      setIsLoading(true);
      try {
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[85vh] sm:h-[90vh] p-0 flex flex-col gap-0 rounded-lg overflow-hidden" dialogId="unified-user-dialog">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 bg-background h-full">

            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-sm border-b border-border p-6 flex-shrink-0 relative">
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <Check className="h-6 w-6 opacity-0" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                    <div className="relative">
                      <FormField
                        control={form.control}
                        name="avatarUrl"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <UserAvatarUpload
                                user={user || { id: '', name: '', email: '', avatarUrl: field.value }}
                                onImageUpload={async (imageUrl) => field.onChange(imageUrl)}
                                onImageRemove={async () => field.onChange('')}
                                size="xl"
                                className="w-24 h-24"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            {...field}
                            className="text-3xl font-bold tracking-tight bg-transparent border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40 md:text-left text-center"
                            placeholder="User Name"
                          />
                        </FormControl>
                        <FormMessage className="text-center md:text-left" />
                      </FormItem>
                    )}
                  />

                  {(mode === 'edit' || mode === 'profile') && user?.email && (
                    <div className="flex items-center gap-2 justify-center md:justify-start text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-center gap-2 text-muted-foreground">
                    <FormField
                      control={form.control}
                      name="positionTitle"
                      render={({ field }) => (
                        <FormItem className="space-y-0 min-w-[200px]">
                          <FormControl>
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                              <Briefcase className="h-4 w-4" />
                              <Input
                                {...field}
                                value={field.value || ''}
                                className="h-8 border-transparent hover:border-border bg-transparent px-2 font-medium w-full text-center md:text-left focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Add job title"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isLoading}>
                    {isSubmitting || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content Area with Tabs */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full bg-background/50">
                <div className="border-b px-6 bg-background/95 backdrop-blur-sm sticky top-0 z-10 w-full">
                  <TabsList className="h-12 bg-transparent p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
                    <TabsTrigger
                      value="personal"
                      className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 font-medium transition-all"
                    >
                       Personal Info
                    </TabsTrigger>
                    <TabsTrigger
                      value="account"
                      className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 font-medium transition-all"
                    >
                      Account
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 font-medium transition-all"
                    >
                      Security
                    </TabsTrigger>
                    {(mode === 'profile' || (mode === 'edit' && user)) && (
                      <TabsTrigger
                        value="preferences"
                        className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 font-medium transition-all"
                      >
                        Preferences
                      </TabsTrigger>
                    )}
                    {user?.id && (
                      <TabsTrigger
                        value="hiring"
                        className="h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 font-medium transition-all"
                      >
                        Hiring
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  <ScrollArea className="h-full w-full">
                    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
                      {activeTab === 'hiring' && user?.id ? (
                        <HiringDetailTab userId={user.id} />
                      ) : (
                        <>
                          <TabsContent value="personal" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <ProfileTab
                              form={form}
                              mode={mode}
                              user={user}
                              customFields={customFields}
                              customFieldDefinitions={customFieldDefinitions}
                              onCustomFieldChange={handleCustomFieldChange}
                            />
                          </TabsContent>

                          <TabsContent value="account" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <UserManagementForm
                              form={form}
                              userGroups={userGroups}
                              isLoadingGroups={isLoadingGroups}
                              canManageUsers={canManageUsers}
                              isEditingSelf={isEditingSelf}
                              canManageTeams={canManageTeams}
                              userTeams={userTeams}
                              canManageAuthentication={canManageAuthentication}
                              isLookingUpAD={isLookingUpAD}
                              handleLookupAzureAD={handleLookupAzureAD}
                            />
                          </TabsContent>

                          <TabsContent value="security" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <SecurityTab
                              form={form}
                              user={user}
                              canForcePasswordChange={canForcePasswordChange || false}
                              show2FASetup={show2FASetup}
                              setShow2FASetup={setShow2FASetup}
                              isLoading={isLoading}
                              handleDisable2FA={handleDisable2FA}
                            />
                          </TabsContent>

                          <TabsContent value="preferences" className="space-y-6 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <PreferencesTab
                              preferences={preferences}
                              updatePreferenceInDB={updatePreferenceInDB}
                              handleResetPreference={handleResetPreference}
                              sidebarShowAssigned={sidebarShowAssigned}
                              saveSidebarPref={saveSidebarPref}
                              isPrefsLoading={isPrefsLoading}
                            />
                          </TabsContent>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Export for use in other components
export type { UnifiedUserFormValues, ModalMode } from './unified-user-modal/types';
