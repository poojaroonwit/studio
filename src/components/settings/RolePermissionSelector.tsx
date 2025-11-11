'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PLATFORM_MODULES, PLATFORM_MODULE_CATEGORIES, type PlatformModuleId } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface RolePermissionSelectorProps {
  selectedPermissions: PlatformModuleId[];
  onPermissionsChange: (permissions: PlatformModuleId[]) => void;
  title?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  noCard?: boolean;
  protectedPermissions?: PlatformModuleId[];
  isLoading?: boolean;
}

export function RolePermissionSelector({
  selectedPermissions = [],
  onPermissionsChange,
  title = "Permission Selection",
  description = "Choose which permissions should be granted to this role.",
  disabled = false,
  className,
  noCard = false,
  protectedPermissions = [],
  isLoading = false
}: RolePermissionSelectorProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Group permissions by category for display - moved to useMemo
  const groupedPermissions = useMemo(() => {
    try {
      // Defensive check to prevent errors
      if (!PLATFORM_MODULE_CATEGORIES || typeof PLATFORM_MODULE_CATEGORIES !== 'object') {
        console.warn('RolePermissionSelector: PLATFORM_MODULE_CATEGORIES is not available:', PLATFORM_MODULE_CATEGORIES);
        return [];
      }
      
      // Ensure PLATFORM_MODULES is an array
      if (!Array.isArray(PLATFORM_MODULES)) {
        console.warn('RolePermissionSelector: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
        return [];
      }
      
      // Ensure PLATFORM_MODULES has valid objects
      const validModules = PLATFORM_MODULES.filter(p => p && typeof p === 'object' && p.id && p.category);
      
      return Object.values(PLATFORM_MODULE_CATEGORIES).map(category => {
        try {
          const permissions = validModules.filter(p => {
            try {
              return p && p.category === category;
            } catch (error) {
              console.warn('RolePermissionSelector: Error filtering platform module:', error, p);
              return false;
            }
          });
          
          return { category, permissions };
        } catch (error) {
          console.error('RolePermissionSelector: Error creating grouped permissions:', error);
          return { category, permissions: [] };
        }
      });
    } catch (error) {
      console.error('RolePermissionSelector: Error creating grouped permissions:', error);
      return [];
    }
  }, []);

  // Enhanced defensive check for selectedPermissions to prevent React error #185
  const safeSelectedPermissions = useMemo(() => {
    try {
      if (!Array.isArray(selectedPermissions)) {
        console.warn('RolePermissionSelector: selectedPermissions is not an array:', selectedPermissions);
        return [];
      }
      // Filter out any invalid permission IDs and ensure they're strings
      return selectedPermissions.filter(p => {
        if (typeof p !== 'string') {
          console.warn('RolePermissionSelector: Invalid permission ID type:', typeof p, p);
          return false;
        }
        if (p.length === 0) {
          console.warn('RolePermissionSelector: Empty permission ID found');
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('RolePermissionSelector: Error processing selectedPermissions:', error);
      return [];
    }
  }, [selectedPermissions]);

  // Enhanced defensive check for protectedPermissions
  const safeProtectedPermissions = useMemo(() => {
    try {
      if (!Array.isArray(protectedPermissions)) {
        console.warn('RolePermissionSelector: protectedPermissions is not an array:', protectedPermissions);
        return [];
      }
      // Filter out any invalid permission IDs and ensure they're strings
      return protectedPermissions.filter(p => {
        if (typeof p !== 'string') {
          console.warn('RolePermissionSelector: Invalid protected permission ID type:', typeof p, p);
          return false;
        }
        if (p.length === 0) {
          console.warn('RolePermissionSelector: Empty protected permission ID found');
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('RolePermissionSelector: Error processing protectedPermissions:', error);
      return [];
    }
  }, [protectedPermissions]);

  // All hooks must be called before any early returns
  const selectCategoryPermissions = useCallback((category: string) => {
    if (disabled) return;
    
    try {
      if (!Array.isArray(PLATFORM_MODULES)) {
        console.warn('RolePermissionSelector: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
        return;
      }
      
      const categoryPermissions = PLATFORM_MODULES
        .filter(p => p && p.category === category)
        .map(p => p.id)
        .filter(Boolean);
      
      const otherPermissions = safeSelectedPermissions.filter(p => 
        !categoryPermissions.includes(p)
      );
      const newPermissions = [...otherPermissions, ...categoryPermissions];
      onPermissionsChange(newPermissions);
    } catch (error) {
      console.error('RolePermissionSelector: Error selecting category permissions:', error);
    }
  }, [disabled, safeSelectedPermissions, onPermissionsChange]);

  const clearCategoryPermissions = useCallback((category: string) => {
    if (disabled) return;
    
    try {
      if (!Array.isArray(PLATFORM_MODULES)) {
        console.warn('RolePermissionSelector: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
        return;
      }
      
      const categoryPermissions = PLATFORM_MODULES
        .filter(p => p && p.category === category)
        .map(p => p.id)
        .filter(Boolean);
      
      const newPermissions = safeSelectedPermissions.filter(p => 
        !categoryPermissions.includes(p) || safeProtectedPermissions.includes(p)
      );
      onPermissionsChange(newPermissions);
    } catch (error) {
      console.error('RolePermissionSelector: Error clearing category permissions:', error);
    }
  }, [disabled, safeSelectedPermissions, safeProtectedPermissions, onPermissionsChange]);

  const filteredGroupedPermissions = useMemo(() => {
    try {
      if (!Array.isArray(groupedPermissions)) {
        console.warn('RolePermissionSelector: groupedPermissions is not an array:', groupedPermissions);
        return [];
      }
      
      return groupedPermissions.map(group => {
        try {
          if (!group || !Array.isArray(group.permissions)) {
            console.warn('RolePermissionSelector: Invalid group structure:', group);
            return { ...group, permissions: [] };
          }
          
          const filtered = group.permissions.filter(p => {
            if (!p || !p.id) return false;
            const matchesSearch = !searchQuery || 
              p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
          });
          
          return { ...group, permissions: filtered };
        } catch (error) {
          console.error('RolePermissionSelector: Error filtering group permissions:', error);
          return { ...group, permissions: [] };
        }
      }).filter(group => group.permissions.length > 0);
    } catch (error) {
      console.error('RolePermissionSelector: Error creating filtered grouped permissions:', error);
      return [];
    }
  }, [groupedPermissions, searchQuery]);

  // Function to preserve scroll position
  const preserveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  // Function to restore scroll position
  const restoreScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  };

  const togglePermission = (permissionId: PlatformModuleId) => {
    if (disabled) return;
    
    // Preserve scroll position
    preserveScrollPosition();
    
    // Prevent removing protected permissions
    if (safeSelectedPermissions.includes(permissionId) && safeProtectedPermissions.includes(permissionId)) {
      return;
    }
    
    const newPermissions = safeSelectedPermissions.includes(permissionId)
      ? safeSelectedPermissions.filter(p => p !== permissionId)
      : [...safeSelectedPermissions, permissionId];
    
    onPermissionsChange(newPermissions);
    
    // Restore scroll position after a short delay
    setTimeout(restoreScrollPosition, 0);
  };

  const selectAllPermissions = () => {
    if (disabled) return;
    
    // Preserve scroll position
    preserveScrollPosition();
    
    try {
      if (!Array.isArray(PLATFORM_MODULES)) {
        console.warn('RolePermissionSelector: PLATFORM_MODULES is not an array:', PLATFORM_MODULES);
        return;
      }
      
      const allPermissions = PLATFORM_MODULES.map(p => p?.id).filter(Boolean);
      onPermissionsChange(allPermissions);
    } catch (error) {
      console.error('RolePermissionSelector: Error selecting all permissions:', error);
    }
    
    // Restore scroll position after a short delay
    setTimeout(restoreScrollPosition, 0);
  };

  const clearAllPermissions = () => {
    if (disabled) return;
    
    // Preserve scroll position
    preserveScrollPosition();
    
    // If there are no protected permissions, clear all
    if (safeProtectedPermissions.length === 0) {
      onPermissionsChange([]);
    } else {
      // Preserve protected permissions when clearing all
      const preservedPermissions = safeSelectedPermissions.filter(p => safeProtectedPermissions.includes(p));
      onPermissionsChange(preservedPermissions);
    }
    
    // Restore scroll position after a short delay
    setTimeout(restoreScrollPosition, 0);
  };

  // Enhanced early validation - must happen after all hooks
  if (!Array.isArray(PLATFORM_MODULES) || PLATFORM_MODULES.length === 0) {
    console.error('RolePermissionSelector: PLATFORM_MODULES is not available or empty');
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <p>Permission data is not available.</p>
          <p className="text-sm">Please refresh the page or contact support.</p>
        </div>
      </div>
    );
  }

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
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {safeSelectedPermissions.length} selected
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
        <div className="flex-1 overflow-y-auto min-h-0" ref={scrollContainerRef}>
          {filteredGroupedPermissions.map(({ category, permissions }) => (
            <div key={`category-${category}`} className="border-b border-border last:border-b-0">
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
                      {(() => {
                        try {
                          const safePermissions = Array.isArray(permissions) ? permissions : [];
                          
                          const selectedCount = safeSelectedPermissions.filter(p => {
                            try {
                              return safePermissions.some(perm => perm && perm.id === p);
                            } catch (error) {
                              console.warn('RolePermissionSelector: Error filtering selected permission:', error, p);
                              return false;
                            }
                          }).length;
                          
                          return `${selectedCount}/${safePermissions.length}`;
                        } catch (error) {
                          console.error('RolePermissionSelector: Error counting selected permissions:', error);
                          return '0/0';
                        }
                      })()}
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
                  try {
                    if (!permission || !permission.id) {
                      console.warn('RolePermissionSelector: Invalid permission object:', permission);
                      return null;
                    }
                    
                    const isProtected = safeProtectedPermissions.includes(permission.id);
                    const isSelected = safeSelectedPermissions.includes(permission.id);
                    const isDisabled = disabled || (isProtected && isSelected);
                    
                    return (
                      <div key={`permission-${permission.id}-${category}`} className="group">
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
                                  {permission.label || permission.id}
                                </span>
                                {isProtected && (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                                    Protected
                                  </Badge>
                                )}
                                {/* Risk Level Badge */}
                                {permission.riskLevel && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      permission.riskLevel === 'LOW' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
                                      permission.riskLevel === 'MEDIUM' && "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
                                      permission.riskLevel === 'HIGH' && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
                                      permission.riskLevel === 'CRITICAL' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                    )}
                                  >
                                    {permission.riskLevel}
                                  </Badge>
                                )}
                                {/* Approval Required Badge */}
                                {permission.requiresApproval && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                                    Approval Required
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                                {permission.id}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {permission.description || 'No description available'}
                            </p>
                            {isProtected && isSelected && (
                              <span className="block text-amber-600 dark:text-amber-400 mt-1 text-xs">
                                This permission cannot be removed for security reasons.
                              </span>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  } catch (error) {
                    console.error('RolePermissionSelector: Error rendering permission:', error, permission);
                    return null;
                  }
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Permissions Summary */}
        {safeSelectedPermissions.length > 0 && (
          <div className="p-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Selected Permissions ({safeSelectedPermissions.length})
              </p>
            </div>
            
            {/* Permission Statistics */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {(() => {
                  const stats = {
                    LOW: 0,
                    MEDIUM: 0,
                    HIGH: 0,
                    CRITICAL: 0,
                    requiresApproval: 0
                  };
                  
                  safeSelectedPermissions.forEach(permissionId => {
                    try {
                      if (!Array.isArray(PLATFORM_MODULES)) {
                        console.warn('RolePermissionSelector: PLATFORM_MODULES is not an array in stats:', PLATFORM_MODULES);
                        return;
                      }
                      
                      const permission = PLATFORM_MODULES.find(p => p && p.id === permissionId);
                      if (permission) {
                        if (permission.riskLevel) {
                          stats[permission.riskLevel]++;
                        }
                        if (permission.requiresApproval) stats.requiresApproval++;
                      }
                    } catch (error) {
                      console.warn('RolePermissionSelector: Error processing permission stats:', error, permissionId);
                    }
                  });
                  
                  return (
                    <>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                        {stats.LOW} Low Risk
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">
                        {stats.MEDIUM} Medium Risk
                      </Badge>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
                        {stats.HIGH} High Risk
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                        {stats.CRITICAL} Critical Risk
                      </Badge>
                      {stats.requiresApproval > 0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                          {stats.requiresApproval} Require Approval
                        </Badge>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {safeSelectedPermissions.slice(0, 5).map(permissionId => {
                try {
                  if (!Array.isArray(PLATFORM_MODULES)) {
                    console.warn('RolePermissionSelector: PLATFORM_MODULES is not an array in summary:', PLATFORM_MODULES);
                    return null;
                  }
                  
                  const permission = PLATFORM_MODULES.find(p => p && p.id === permissionId);
                  return (
                    <Badge 
                      key={permissionId} 
                      variant="secondary" 
                      className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    >
                      {permission?.label || permissionId}
                    </Badge>
                  );
                } catch (error) {
                  console.warn('RolePermissionSelector: Error rendering permission badge:', error, permissionId);
                  return null;
                }
              })}
              {safeSelectedPermissions.length > 5 && (
                <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-500/30">
                  +{safeSelectedPermissions.length - 5} more
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