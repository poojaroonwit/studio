'use client';

import React, { useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UserGroup } from '@/lib/types';
import {
  RoleCategorySection,
  RoleSelectorHeader,
  RoleSelectorSearch,
  RoleSelectorToolbar,
  SelectedRolesSummary,
} from './RoleSelectorParts';
import {
  filterRoleSelectorRoles,
  groupRoleSelectorRoles,
  ROLE_SELECTOR_CATEGORY_ORDER,
} from './role-selector-utils';

interface RoleSelectorProps {
  availableRoles: UserGroup[];
  selectedRoleIds: string[];
  onRolesChange: (roleIds: string[]) => void;
  title?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
  noCard?: boolean;
}

export function RoleSelector({
  availableRoles,
  selectedRoleIds,
  onRolesChange,
  title = 'Group Selection',
  description = 'Choose which permission groups should be assigned to this user.',
  disabled = false,
  className,
  multiple = false,
  noCard = false,
}: RoleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const groupedRoles = useMemo(() => {
    const filteredRoles = filterRoleSelectorRoles(availableRoles, searchQuery);
    return groupRoleSelectorRoles(filteredRoles);
  }, [availableRoles, searchQuery]);

  const toggleRole = (roleId: string) => {
    if (disabled) return;

    if (!multiple) {
      onRolesChange([roleId]);
      return;
    }

    onRolesChange(
      selectedRoleIds.includes(roleId)
        ? selectedRoleIds.filter(id => id !== roleId)
        : [...selectedRoleIds, roleId]
    );
  };

  const selectAllRoles = () => {
    if (disabled || !multiple) return;
    onRolesChange(availableRoles.map(role => role.id));
  };

  const clearAllRoles = () => {
    if (disabled) return;
    onRolesChange([]);
  };

  const content = (
    <>
      {!noCard && (
        <RoleSelectorHeader
          description={description}
          title={title}
        />
      )}

      <div className={cn('p-0 flex-1 overflow-hidden flex flex-col', noCard ? 'pt-0' : '')}>
        {multiple && (
          <RoleSelectorToolbar
            disabled={disabled}
            onClearAll={clearAllRoles}
            onSelectAll={selectAllRoles}
            selectedCount={selectedRoleIds.length}
          />
        )}

        <RoleSelectorSearch
          disabled={disabled}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          {ROLE_SELECTOR_CATEGORY_ORDER.map(category => (
            <RoleCategorySection
              key={category}
              category={category}
              disabled={disabled}
              multiple={multiple}
              onRolesChange={onRolesChange}
              onToggleRole={toggleRole}
              roles={groupedRoles[category]}
              selectedRoleIds={selectedRoleIds}
            />
          ))}
        </div>

        <SelectedRolesSummary
          availableRoles={availableRoles}
          multiple={multiple}
          selectedRoleIds={selectedRoleIds}
        />
      </div>
    </>
  );

  if (noCard) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {content}
      </div>
    );
  }

  return (
    <Card className={cn('border border-border shadow-sm flex flex-col', className)}>
      {content}
    </Card>
  );
}
