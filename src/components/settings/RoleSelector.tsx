'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { UserGroup } from '@/lib/types';

interface RoleSelectorProps {
  availableRoles: UserGroup[];
  selectedRoleIds: string[];
  onRolesChange: (roleIds: string[]) => void;
  title?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  multiple?: boolean; // Allow multiple role selection
}

export function RoleSelector({
  availableRoles,
  selectedRoleIds,
  onRolesChange,
  title = "Role Selection",
  description = "Choose which roles should be assigned to this user.",
  disabled = false,
  className,
  multiple = false
}: RoleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const toggleRole = (roleId: string) => {
    if (disabled) return;
    
    if (multiple) {
      const newRoleIds = selectedRoleIds.includes(roleId)
        ? selectedRoleIds.filter(id => id !== roleId)
        : [...selectedRoleIds, roleId];
      
      onRolesChange(newRoleIds);
    } else {
      // Single selection - replace the current selection
      onRolesChange([roleId]);
    }
  };

  const selectAllRoles = () => {
    if (disabled || !multiple) return;
    const allRoleIds = availableRoles.map(role => role.id);
    onRolesChange(allRoleIds);
  };

  const clearAllRoles = () => {
    if (disabled) return;
    onRolesChange([]);
  };

  const filteredRoles = availableRoles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleCategory = (role: UserGroup) => {
    if (role.is_system_role) return 'System Roles';
    if (role.is_default) return 'Default Roles';
    return 'Custom Roles';
  };

  // Group roles by category
  const groupedRoles = filteredRoles.reduce((acc, role) => {
    const category = getRoleCategory(role);
    if (!acc[category]) acc[category] = [];
    acc[category].push(role);
    return acc;
  }, {} as Record<string, UserGroup[]>);

  const categoryOrder = ['System Roles', 'Default Roles', 'Custom Roles'];

  return (
    <Card className={cn("border border-border shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          <span>{title}</span>
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Quick Selection Controls */}
        {multiple && (
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllRoles}
                disabled={disabled}
                className="h-7 px-2 text-xs"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllRoles}
                disabled={disabled}
                className="h-7 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedRoleIds.length} selected
            </Badge>
          </div>
        )}

        {/* Search Input */}
        <div className="p-4 border-b">
          <div className="relative">
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
              disabled={disabled}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Scrollable Role Groups */}
        <div className="h-[400px] overflow-y-auto">
          {categoryOrder.map(category => {
            const roles = groupedRoles[category];
            if (!roles || roles.length === 0) return null;

            return (
              <div key={category} className="border-b border-border last:border-b-0">
                {/* Category Header */}
                <div className="sticky top-0 bg-background border-b border-border/50 px-4 py-2 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-foreground capitalize">
                        {category.toLowerCase()}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {roles.length}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">
                        {selectedRoleIds.filter(id => roles.some(role => role.id === id)).length}/{roles.length}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Role Options */}
                <div className="divide-y divide-border/50">
                  {roles.map(role => (
                    <div key={role.id} className="group">
                      <label className={cn(
                        "flex items-center space-x-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer",
                        disabled && "cursor-not-allowed opacity-50"
                      )}>
                        <Checkbox
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                          disabled={disabled}
                          className="rounded border-2 border-primary/30 focus:ring-2 focus:ring-primary text-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {role.name}
                            </span>
                            <div className="flex items-center space-x-1">
                              {role.is_system_role && (
                                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                  System
                                </Badge>
                              )}
                              {role.is_default && (
                                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                  Default
                                </Badge>
                              )}
                              {role.user_count !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {role.user_count} users
                                </Badge>
                              )}
                            </div>
                          </div>
                          {role.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Roles Summary */}
        {selectedRoleIds.length > 0 && (
          <div className="p-4 border-t bg-muted/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Selected Roles ({selectedRoleIds.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedRoleIds.slice(0, 5).map(roleId => {
                const role = availableRoles.find(r => r.id === roleId);
                return (
                  <Badge 
                    key={roleId} 
                    variant="secondary" 
                    className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  >
                    {role?.name || roleId}
                  </Badge>
                );
              })}
              {selectedRoleIds.length > 5 && (
                <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-500/30">
                  +{selectedRoleIds.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 