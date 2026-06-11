import { UsersRound } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UsersPageUsersFilters } from './UsersPageUsersFilters';
import { UsersPageUserRow } from './UsersPageUsersRows';
import type { UsersPageUsersTabProps } from './UsersPageUsersTabTypes';

export function UsersPageUsersTab({
  users,
  teams,
  roles,
  nameFilter,
  emailFilter,
  roleFilter,
  teamFilter,
  selectedUserIds,
  isAllSelectedOnPage,
  onNameFilterChange,
  onEmailFilterChange,
  onRoleFilterChange,
  onTeamFilterChange,
  onApplyFilters,
  onSelectAllOnPage,
  onSelectUser,
  onOpenUserModal,
  onToggleUserStatus,
  onConfirmDeleteUser,
}: UsersPageUsersTabProps) {
  return (
    <>
      <UsersPageUsersFilters
        teams={teams}
        roles={roles}
        nameFilter={nameFilter}
        emailFilter={emailFilter}
        roleFilter={roleFilter}
        teamFilter={teamFilter}
        onNameFilterChange={onNameFilterChange}
        onEmailFilterChange={onEmailFilterChange}
        onRoleFilterChange={onRoleFilterChange}
        onTeamFilterChange={onTeamFilterChange}
        onApplyFilters={onApplyFilters}
      />

      {users.length === 0 ? (
        <div className="text-center py-10">
          <UsersRound className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] px-2">
                  <Checkbox checked={isAllSelectedOnPage} onCheckedChange={onSelectAllOnPage} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <UsersPageUserRow
                  key={user.id}
                  user={user}
                  selectedUserIds={selectedUserIds}
                  onSelectUser={onSelectUser}
                  onOpenUserModal={onOpenUserModal}
                  onToggleUserStatus={onToggleUserStatus}
                  onConfirmDeleteUser={onConfirmDeleteUser}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
