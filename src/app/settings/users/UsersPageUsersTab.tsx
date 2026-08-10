import { useMemo, useState } from 'react';

import { UsersRound } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import {
  SortableTableHead,
  type SortDirection,
  sortRowsByColumn,
  type SortValueResolverMap,
} from '@/components/ui/sortable-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UserProfile } from '@/lib/types';
import { UsersPageUsersFilters } from './UsersPageUsersFilters';
import { UsersPageUserRow } from './UsersPageUsersRows';
import { getUserAccountStatus, getUserRoleBadgeLabel } from './users-page-utils';
import type { UsersPageUsersTabProps } from './UsersPageUsersTabTypes';
import { UsersBulkActionsBar } from './UsersBulkActionsBar';

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
  isBulkUpdating,
  canEditUsers,
  onNameFilterChange,
  onEmailFilterChange,
  onRoleFilterChange,
  onTeamFilterChange,
  onApplyFilters,
  onSelectAllOnPage,
  onSelectUser,
  onBulkUpdateStatus,
  onClearSelection,
  onOpenUserModal,
  onToggleUserStatus,
  onConfirmDeleteUser,
}: UsersPageUsersTabProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const sortResolvers = useMemo<SortValueResolverMap<UserProfile>>(
    () => ({
      name: user => user.name || '',
      email: user => user.email || '',
      role: user => getUserRoleBadgeLabel(user),
      teams: user => (user.teams || []).map(team => team.name).join(', '),
      status: user => getUserAccountStatus(user),
    }),
    [],
  );

  const sortedUsers = useMemo(
    () => sortRowsByColumn(users, sortColumn, sortDirection, sortResolvers),
    [users, sortColumn, sortDirection, sortResolvers],
  );

  const handleSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

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
          <UsersBulkActionsBar
            selectedCount={selectedUserIds.size}
            isUpdating={isBulkUpdating}
            canUpdate={canEditUsers}
            onUpdateStatus={onBulkUpdateStatus}
            onClear={onClearSelection}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] px-2">
                  <Checkbox checked={isAllSelectedOnPage} onCheckedChange={onSelectAllOnPage} />
                </TableHead>
                <SortableTableHead
                  column="name"
                  label="Name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHead
                  column="email"
                  label="Email"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHead
                  column="role"
                  label="Role"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHead
                  column="teams"
                  label="Teams"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHead
                  column="status"
                  label="Status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
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
