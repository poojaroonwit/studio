'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  noCard?: boolean; // Don't render the card wrapper
}

export function RoleSelector({
  availableRoles,
  selectedRoleIds,
  onRolesChange,
  title = "Group Selection",
  description = "Choose which permission groups should be assigned to this user.",
  disabled = false,
  className,
  multiple = false,
  noCard = false
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
    if (role.is_system_role) return 'System Groups';
    if (role.is_default) return 'Default Groups';
    return 'Custom Groups';
  };

  // Group roles by category
  const groupedRoles = filteredRoles.reduce((acc, role) => {
    const category = getRoleCategory(role);
    if (!acc[category]) acc[category] = [];
    acc[category].push(role);
    return acc;
  }, {} as Record<string, UserGroup[]>);

  const categoryOrder = ['System Groups', 'Default Groups', 'Custom Groups'];

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
      <div className={cn("p-0 flex-1 overflow-hidden flex flex-col", noCard ? "pt-0" : "")}>
        {/* Quick Selection Controls */}
        {multiple && (
          <div className="flex items-center justify-between p-4 border-b bg-muted/30 flex-shrink-0">
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
        <div className="p-4 border-b flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto min-h-0">
          {categoryOrder.map(category => {
            const roles = groupedRoles[category];
            if (!roles || roles.length === 0) return null;

            return (
              <div key={category} className="border-b border-border last:border-b-0">
                {/* Category Header */}
                <div className="sticky top-0 bg-background border-b border-border/50 px-4 py-2 z-5">
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
                         {multiple 
                           ? `${(() => {
                              try {
                                // Defensive check to prevent filter errors
                                if (!Array.isArray(selectedRoleIds) || !Array.isArray(roles)) {
                                  console.warn('RoleSelector: selectedRoleIds or roles is not an array:', { selectedRoleIds, roles });
                                  return 0;
                                }
                                
                                return selectedRoleIds.filter(id => {
                                  try {
                                    return roles.some(role => role && role.id === id);
                                  } catch (error) {
                                    console.warn('RoleSelector: Error filtering selected role ID:', error, id);
                                    return false;
                                  }
                                }).length;
                              } catch (error) {
                                console.error('RoleSelector: Error counting selected roles:', error);
                                return 0;
                              }
                            })()}/${Array.isArray(roles) ? roles.length : 0}`
                          : (() => {
                              try {
                                // Defensive check to prevent filter errors
                                if (!Array.isArray(selectedRoleIds) || !Array.isArray(roles)) {
                                  console.warn('RoleSelector: selectedRoleIds or roles is not an array:', { selectedRoleIds, roles });
                                  return '0 selected';
                                }
                                
                                const selectedCount = selectedRoleIds.filter(id => {
                                  try {
                                    return roles.some(role => role && role.id === id);
                                  } catch (error) {
                                    console.warn('RoleSelector: Error filtering selected role ID:', error, id);
                                    return false;
                                  }
                                }).length;
                                
                                return selectedCount > 0 ? '1 selected' : '0 selected';
                              } catch (error) {
                                console.error('RoleSelector: Error counting selected roles:', error);
                                return '0 selected';
                              }
                            })()
                        }
                       </span>
                     </div>
                  </div>
                </div>
                
                                 {/* Role Options */}
                 <div className="divide-y divide-border/50">
                   {multiple ? (
                     // Multiple selection with checkboxes
                     roles.map(role => (
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
                     ))
                   ) : (
                     // Single selection with radio buttons
                     <RadioGroup 
                       value={selectedRoleIds[0] || ''} 
                       onValueChange={(value) => onRolesChange([value])}
                       disabled={disabled}
                     >
                       {roles.map(role => (
                         <div key={role.id} className="group">
                           <label className={cn(
                             "flex items-center space-x-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer",
                             disabled && "cursor-not-allowed opacity-50"
                           )}>
                             <RadioGroupItem
                               value={role.id}
                               className="border-2 border-primary/30 focus:ring-2 focus:ring-primary text-primary"
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
                     </RadioGroup>
                   )}
                 </div>
              </div>
            );
          })}
        </div>

        {/* Selected Roles Summary */}
        {selectedRoleIds.length > 0 && (
          <div className="p-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                {multiple ? `Selected Roles (${selectedRoleIds.length})` : 'Selected Group'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {multiple ? (
                // Multiple selection display
                <>
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
                </>
              ) : (
                // Single selection display
                selectedRoleIds.map(roleId => {
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
                })
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
    <Card className={cn("border border-border shadow-sm flex flex-col", className)}>
      {content}
    </Card>
  );
} 