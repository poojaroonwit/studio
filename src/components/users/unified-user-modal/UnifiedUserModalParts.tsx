"use client";

import type { UseFormReturn } from 'react-hook-form';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UserProfile } from '@/lib/types';
import type { ModalMode, UnifiedUserFormValues } from './types';
import {
  UnifiedUserAvatarField,
  UnifiedUserHeaderActions,
  UnifiedUserIdentityFields,
  UnifiedUserModalCloseButton,
} from './UnifiedUserModalHeaderParts';

type UnifiedUserModalHeaderProps = {
  form: UseFormReturn<UnifiedUserFormValues>;
  user?: UserProfile | null;
  mode: ModalMode;
  isSaving: boolean;
  onClose: () => void;
};

export function UnifiedUserModalHeader({
  form,
  user,
  mode,
  isSaving,
  onClose,
}: UnifiedUserModalHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 shadow-sm p-4 flex-shrink-0 relative">
      <UnifiedUserModalCloseButton onClose={onClose} />

      <div className="flex flex-col md:flex-row items-center gap-4">
        <UnifiedUserAvatarField form={form} user={user} />
        <UnifiedUserIdentityFields form={form} mode={mode} user={user} />
        <UnifiedUserHeaderActions isSaving={isSaving} onClose={onClose} />
      </div>
    </div>
  );
}

const TAB_TRIGGER_CLASS =
  "h-12 !rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium transition-all text-muted-foreground data-[state=active]:text-foreground hover:text-foreground relative bottom-[-2px] z-10";

type UnifiedUserModalTabsListProps = {
  mode: ModalMode;
  user?: UserProfile | null;
};

export function UnifiedUserModalTabsList({ mode, user }: UnifiedUserModalTabsListProps) {
  return (
    <div className="border-b-2 border-zinc-200 dark:border-zinc-800 px-6 bg-background/95 backdrop-blur-sm sticky top-0 z-10 w-full">
      <TabsList className="h-12 bg-transparent p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
        <TabsTrigger value="personal" className={TAB_TRIGGER_CLASS}>
          Personal Info
        </TabsTrigger>
        <TabsTrigger value="account" className={TAB_TRIGGER_CLASS}>
          Account
        </TabsTrigger>
        <TabsTrigger value="security" className={TAB_TRIGGER_CLASS}>
          Security
        </TabsTrigger>
        {(mode === 'profile' || (mode === 'edit' && user)) && (
          <TabsTrigger value="preferences" className={TAB_TRIGGER_CLASS}>
            Preferences
          </TabsTrigger>
        )}
        {user?.id && (
          <TabsTrigger value="hiring" className={TAB_TRIGGER_CLASS}>
            Hiring
          </TabsTrigger>
        )}
      </TabsList>
    </div>
  );
}
