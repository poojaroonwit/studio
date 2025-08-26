'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES, type PlatformModuleId } from '@/lib/types';

interface RolePermissionSelectorProps {
  selectedPermissions: PlatformModuleId[];
  onPermissionsChange: (permissions: PlatformModuleId[]) => void;
  title?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  noCard?: boolean;
  protectedPermissions?: PlatformModuleId[];
}

// Group permissions by category for display
const groupedPermissions = Object.values(PLATFORM_MODULE_CATEGORIES).map(category => ({
  category,
  permissions: PLATFORM_MODULES.filter(p => p.category === category)
}));

export function RolePermissionSelector({
  selectedPermissions,
  onPermissionsChange,
  title = "Permission Selection",
  description = "Choose which permissions should be granted to this role.",
  disabled = false,
  className,
  noCard = false,
  protectedPermissions = []
}: RolePermissionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const togglePermission = (permissionId: PlatformModuleId) => {
    if (disabled) return;
    
    // Prevent removing protected permissions
    if (selectedPermissions.includes(permissionId) && protectedPermissions.includes(permissionId)) {
      return;
    }
    
    const newPermissions = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(p => p !== permissionId)
      : [...selectedPermissions, permissionId];
    
    onPermissionsChange(newPermissions);
  };

  const selectAllPermissions = () => {
    if (disabled) return;
    const allPermissions = PLATFORM_MODULES.map(p => p.id);
    onPermissionsChange(allPermissions);
  };

  const clearAllPermissions = () => {
    if (disabled) return;
    
    // If there are no protected permissions, clear all
    if (protectedPermissions.length === 0) {
      onPermissionsChange([]);
      return;
    }
    
    // Preserve protected permissions when clearing all
    const preservedPermissions = selectedPermissions.filter(p => protectedPermissions.includes(p));
    onPermissionsChange(preservedPermissions);
  };

  const selectCategoryPermissions = (category: string) => {
    if (disabled) return;
    const categoryPermissions = PLATFORM_MODULES
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const otherPermissions = selectedPermissions.filter(p => 
      !categoryPermissions.includes(p)
    );
    const newPermissions = [...otherPermissions, ...categoryPermissions];
    onPermissionsChange(newPermissions);
  };

  const clearCategoryPermissions = (category: string) => {
    if (disabled) return;
    const categoryPermissions = PLATFORM_MODULES
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const newPermissions = selectedPermissions.filter(p => 
      !categoryPermissions.includes(p) || protectedPermissions.includes(p)
    );
    onPermissionsChange(newPermissions);
  };

  const filteredGroupedPermissions = groupedPermissions.map(group => ({
    ...group,
    permissions: group.permissions.filter(permission =>
      permission.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.permissions.length > 0);

  const content = (
    <>
      {!noCard && (
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>{title}</span>
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
      )}
      <div className={cn("p-0 flex-1 overflow-hidden flex flex-col min-h-0", noCard ? "pt-0" : "")}>
        {/* Quick Selection Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllPermissions}
              disabled={disabled}
              className="h-7 px-2 text-xs"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllPermissions}
              disabled={disabled}
              className="h-7 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs">
            {selectedPermissions.length} selected
          </Badge>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="relative">
            <Input
              placeholder="Search permissions..."
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

        {/* Scrollable Permission Groups */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredGroupedPermissions.map(({ category, permissions }) => (
            <div key={category} className="border-b border-border last:border-b-0">
              {/* Category Header */}
              <div className="sticky top-0 bg-background border-b border-border/50 px-4 py-2 z-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-semibold text-foreground capitalize">
                      {category.toLowerCase()}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {permissions.length}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">
                      {selectedPermissions.filter(p => permissions.some(perm => perm.id === p)).length}/{permissions.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectCategoryPermissions(category)}
                      disabled={disabled}
                      className="h-5 px-1 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearCategoryPermissions(category)}
                      disabled={disabled}
                      className="h-5 px-1 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Permission Options */}
              <div className="divide-y divide-border/50">
                {permissions.map(permission => {
                  const isProtected = protectedPermissions.includes(permission.id);
                  const isSelected = selectedPermissions.includes(permission.id);
                  const isDisabled = disabled || (isProtected && isSelected);
                  
                  return (
                    <div key={permission.id} className="group">
                      <label className={cn(
                        "flex items-center space-x-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer",
                        isDisabled && "cursor-not-allowed opacity-50"
                      )}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePermission(permission.id)}
                          disabled={isDisabled}
                          className="rounded border-2 border-primary/30 focus:ring-2 focus:ring-primary text-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {permission.label}
                              </span>
                              {isProtected && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                                  Protected
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                              {permission.id}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {permission.description}
                            {isProtected && isSelected && (
                              <span className="block text-amber-600 dark:text-amber-400 mt-1">
                                This permission cannot be removed for security reasons.
                              </span>
                            )}
                          </p>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Permissions Summary */}
        {selectedPermissions.length > 0 && (
          <div className="p-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Selected Permissions ({selectedPermissions.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedPermissions.slice(0, 5).map(permissionId => {
                const permission = PLATFORM_MODULES.find(p => p.id === permissionId);
                return (
                  <Badge 
                    key={permissionId} 
                    variant="secondary" 
                    className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  >
                    {permission?.label || permissionId}
                  </Badge>
                );
              })}
              {selectedPermissions.length > 5 && (
                <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-500/30">
                  +{selectedPermissions.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (noCard) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {content}
      </div>
    );
  }

  return (
    <Card className={cn("border border-border shadow-sm flex flex-col h-full", className)}>
      {content}
    </Card>
  );
} 