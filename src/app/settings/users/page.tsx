// src/app/settings/users/page.tsx
"use client";

import { Loader2 } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { UnifiedUserModal } from '@/components/users/UnifiedUserModal';

import {
  SafeGroupsTab,
  UsersPageHeader,
  UsersPageTabs,
} from './UsersPageParts';
import { UsersPageUsersTab } from './UsersPageUsersTab';
import { UsersDeleteDialog } from './UsersDeleteDialog';
import { useUsersPageController } from './use-users-page-controller';

export default function ManageUsersPage() {
  const controller = useUsersPageController();

  if (controller.isInitialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <UsersPageHeader
        activeTab={controller.activeTab}
        canCreateUsers={controller.canCreateUsers}
        isSyncing={controller.isSyncing}
        onSyncFromAD={controller.handleSyncFromAD}
        onAddUser={() => controller.openUserModal('create')}
      />

      <UsersPageTabs
        activeTab={controller.activeTab}
        onTabChange={controller.setActiveTab}
      />

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-4">
          {controller.activeTab === 'users' && (
            <UsersPageUsersTab
              users={controller.users}
              teams={controller.teams}
              roles={controller.roles}
              nameFilter={controller.nameFilter}
              emailFilter={controller.emailFilter}
              roleFilter={controller.roleFilter}
              teamFilter={controller.teamFilter}
              selectedUserIds={controller.selectedUserIds}
              isAllSelectedOnPage={controller.isAllSelectedOnPage}
              isBulkUpdating={controller.isBulkUpdating}
              canEditUsers={controller.canEditUsers}
              onNameFilterChange={controller.setNameFilter}
              onEmailFilterChange={controller.setEmailFilter}
              onRoleFilterChange={controller.setRoleFilter}
              onTeamFilterChange={controller.setTeamFilter}
              onApplyFilters={controller.handleApplyFilters}
              onSelectAllOnPage={controller.handleSelectAllOnPage}
              onSelectUser={controller.handleSelectUser}
              onBulkUpdateStatus={controller.handleBulkUpdateStatus}
              onClearSelection={controller.clearSelection}
              onOpenUserModal={controller.openUserModal}
              onToggleUserStatus={controller.handleToggleUserStatus}
              onConfirmDeleteUser={controller.setUserToDelete}
            />
          )}

          {controller.activeTab === 'groups' && <SafeGroupsTab />}
        </div>
      </ScrollArea>

      <UnifiedUserModal
        isOpen={controller.isUserModalOpen}
        onOpenChange={controller.setIsUserModalOpen}
        mode={controller.modalMode}
        user={controller.selectedUser}
        onSave={controller.handleSaveUser}
        onEditUser={controller.handleEditUser}
        onAddUser={controller.handleAddUser}
      />

      <UsersDeleteDialog
        user={controller.userToDelete}
        onCancel={() => controller.setUserToDelete(null)}
        onConfirm={controller.handleDeleteUser}
      />
    </div>
  );
}
