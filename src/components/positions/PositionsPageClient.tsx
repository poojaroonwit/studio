"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Edit, Trash2, Search, Filter, Loader2, X, MoreVertical, ChevronUp, ChevronDown, Users, Eye, Download, Upload } from "lucide-react";
import type { Position } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { AddPositionModal, type AddPositionFormValues } from '@/components/positions/AddPositionModal';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { useSession } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableWrapper } from "@/components/ui/responsive-table";
import { ImportPositionsModal } from '@/components/positions/ImportPositionsModal';
import { RecruiterFilterSidebar } from '@/components/positions/RecruiterFilterSidebar';
import { RecruiterCell } from '@/components/positions/RecruiterCell';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { ChevronsUpDown, Check, UserX, User, RotateCcw } from 'lucide-react';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { checkSLAViolation, getSLABadgeVariant, formatSLAMessage, getSLARemainingDays } from '@/lib/slaUtils';
import { Pagination } from '@/components/ui/pagination';
import { useJobMatchFeature } from '@/hooks/useJobMatchFeature';


export default function PositionsPageClient() {
  // Use persistent user preferences
  const { 
    positions: preferences, 
    updatePositionsPreferences, 
    resetPositionsPreferences,
    isLoaded 
  } = useUserPreferences();

  // Check if job match feature is enabled
  const { isJobMatchEnabled } = useJobMatchFeature();

  // All useState hooks first
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState(preferences.searchTerm);
  const [departmentFilter, setDepartmentFilter] = useState(preferences.departmentFilter);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize page from URL or default to 1
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      return pageParam ? parseInt(pageParam, 10) : 1;
    }
    return 1;
  });
  
  const [pageSize, setPageSize] = useState(preferences.pageSize);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({ total: 0, open: 0, closed: 0 });
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(preferences.selectedRecruiterId);
  const [recruiterStats, setRecruiterStats] = useState<{ [key: string]: number }>({});
  const [availableRecruiters, setAvailableRecruiters] = useState<{id: string, name: string, avatarUrl?: string}[]>([]);
  const [assigningRecruiter, setAssigningRecruiter] = useState<string | null>(null);
  const [headcountData, setHeadcountData] = useState<{ [positionId: string]: { total: number; vacant: number; filled: number } }>({});
  const [isLoadingHeadcount, setIsLoadingHeadcount] = useState(false);
  const [vacantFromOpenPositions, setVacantFromOpenPositions] = useState({ vacant: 0, totalOpen: 0 });

  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const { data: session } = useSession();
  
      // FIXED: Stabilize callback functions to prevent infinite loops
      const handlePositionUpdate = useCallback((updatedPosition: any) => {
        setPositions(prevPositions => {
          const existingIndex = prevPositions.findIndex(p => p.id === updatedPosition.id);
          if (existingIndex !== -1) {
            const updated = [...prevPositions];
            updated[existingIndex] = { ...updated[existingIndex], ...updatedPosition };
            return updated;
          } else {
            return [...prevPositions, updatedPosition];
          }
        });
      }, []);

      const handleNotificationUpdate = useCallback((notification: any) => {
        // Handle position-related notifications
      }, []);
  
  // Debounce/search refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchStuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we should update preferences (prevent circular updates)
  const shouldUpdatePreferencesRef = useRef(true);
  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);
  // Ref for preferences timeout cleanup
  const preferencesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // statusFilter: initialize from preferences or URL
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>(() => {
    // First check URL parameters (for navigation from dashboard)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const statusParam = searchParams.get('status');
      const queryParam = searchParams.get('query');
      if (statusParam && statusParam.toLowerCase() === 'open') return 'open';
      if (statusParam && statusParam.toLowerCase() === 'closed') return 'closed';
      if (queryParam) {
        // Try to extract status:Open or status:Closed from the query string
        const match = queryParam.match(/status:(open|closed)/i);
        if (match) {
          if (match[1].toLowerCase() === 'open') return 'open';
          if (match[1].toLowerCase() === 'closed') return 'closed';
        }
      }
    }
    // Fall back to preferences
    return preferences.statusFilter as 'all' | 'open' | 'closed';
  });

  // Sync statusFilter with URL changes (for navigation from dashboard)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const statusParam = searchParams.get('status');
      const queryParam = searchParams.get('query');
      let newStatus: 'all' | 'open' | 'closed' = 'all';
      if (statusParam && statusParam.toLowerCase() === 'open') newStatus = 'open';
      if (statusParam && statusParam.toLowerCase() === 'closed') newStatus = 'closed';
      if (queryParam) {
        const match = queryParam.match(/status:(open|closed)/i);
        if (match) {
          if (match[1].toLowerCase() === 'open') newStatus = 'open';
          if (match[1].toLowerCase() === 'closed') newStatus = 'closed';
        }
      }
      setStatusFilter(newStatus);
    }
  }, [searchParams]);

  // Update local state when preferences are loaded
  useEffect(() => {
    if (isLoaded) {
      // Temporarily disable preference updates to prevent circular dependency
      shouldUpdatePreferencesRef.current = false;
      
      setSearchTerm(preferences.searchTerm);
      setDepartmentFilter(preferences.departmentFilter);
      setPageSize(preferences.pageSize);
      setSelectedRecruiterId(preferences.selectedRecruiterId);
      // Only update statusFilter if no URL parameters are present
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const statusParam = searchParams.get('status');
        const queryParam = searchParams.get('query');
        if (!statusParam && !queryParam) {
          setStatusFilter(preferences.statusFilter as 'all' | 'open' | 'closed');
        }
      }
      
      // Re-enable preference updates after state is set
      // Clear any existing timeout
      if (preferencesTimeoutRef.current) {
        clearTimeout(preferencesTimeoutRef.current);
      }
      preferencesTimeoutRef.current = setTimeout(() => {
        shouldUpdatePreferencesRef.current = true;
      }, 0);
    }
  }, [isLoaded, preferences.searchTerm, preferences.departmentFilter, preferences.pageSize, preferences.selectedRecruiterId, preferences.statusFilter]);

  // Update preferences when local state changes
  useEffect(() => {
    if (isLoaded && shouldUpdatePreferencesRef.current) {
      updatePositionsPreferences({
        searchTerm,
        departmentFilter,
        statusFilter,
        selectedRecruiterId,
        pageSize,
      });
    }
  }, [searchTerm, departmentFilter, statusFilter, selectedRecruiterId, pageSize, isLoaded]);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts to prevent memory leaks
      if (preferencesTimeoutRef.current) {
        clearTimeout(preferencesTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (searchStuckTimeoutRef.current) {
        clearTimeout(searchStuckTimeoutRef.current);
      }
      
      // Reset all loading states to prevent stuck UI
      setIsLoading(false);
      setIsTableLoading(false);
      setIsSearching(false);
      setAssigningRecruiter(null);
    };
  }, []);

  // Manual reset function for debugging
  const resetAssigningRecruiter = useCallback(() => {
    setAssigningRecruiter(null);
  }, []);



  // Department filter popover state
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Robust handler for department selection
  const handleDepartmentSelect = (dept: string) => {
    setDepartmentFilter(dept);
    setDepartmentPopoverOpen(false);
    setDepartmentSearch('');
  };

  // Handler for recruiter selection
  const handleRecruiterSelect = (recruiterId: string | null) => {
    setSelectedRecruiterId(recruiterId);
    setPage(1); // Reset to first page when changing recruiter filter
    updateURL(1); // Update URL to reflect page reset
  };

  // Handler for assigning/unassigning recruiter to position
  const handleAssignRecruiterToPosition = async (positionId: string, recruiterId: string | null) => {
    // Prevent multiple simultaneous assignments for the same position
    if (assigningRecruiter === positionId) {
      return;
    }
    
    setAssigningRecruiter(positionId);
    
    // Store previous state for rollback
    const prevPositions = [...positions];
    let recruiterName = null;
    
    if (recruiterId) {
      // Find the recruiter name from available recruiters
      const foundRecruiter = availableRecruiters.find(r => r.id === recruiterId);
      recruiterName = foundRecruiter?.name || null;
      
      // If not found in availableRecruiters, try to fetch it to ensure we have the latest data
      if (!foundRecruiter) {
        // Recruiter not found in availableRecruiters, this might cause display issues
      }
    }
    
    // Optimistically update the UI
    setPositions(prev => prev.map(p => 
      p.id === positionId 
        ? { 
            ...p, 
            recruiterId: recruiterId,
            recruiterName: recruiterName
          }
        : p
    ));

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`/api/positions/${positionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update recruiter assignment: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Update the position with the actual API response data to ensure consistency
      const updatedPosition = responseData.position;
      
      if (updatedPosition) {
        // Verify that the updated position has recruiterName when recruiterId is set
        if (updatedPosition.recruiterId && !updatedPosition.recruiterName) {
          // Use a more targeted approach instead of full refresh
          const enrichedPosition = {
            ...updatedPosition,
            recruiterName: recruiterName || null
          };
          setPositions(prev => prev.map(p => 
            p.id === positionId 
              ? enrichedPosition
              : p
          ));
        } else {
          // Ensure the updated position has all the necessary fields
          setPositions(prev => prev.map(p => 
            p.id === positionId 
              ? { 
                  ...p, 
                  ...updatedPosition,
                  // Ensure custom_attributes is properly handled
                  custom_attributes: updatedPosition.custom_attributes || updatedPosition.customAttributes || {},
                  // Ensure recruiterName is properly handled
                  recruiterName: updatedPosition.recruiterName || recruiterName || null
                }
              : p
          ));
        }
      } else {
        // If no position data in response, revert to previous state
        setPositions(prevPositions);
        throw new Error('Invalid response from server');
      }
      
      // Check if recruiter sync happened
      if (responseData.recruiterSync) {
        const sync = responseData.recruiterSync;
        if (sync.candidatesUpdated > 0) {
          toast.success(
            `Recruiter assigned successfully. ${sync.candidatesUpdated} candidate${sync.candidatesUpdated > 1 ? 's' : ''} automatically assigned.`
          );
        } else {
          toast.success(recruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
        }
      } else {
        toast.success(recruiterId ? 'Recruiter assigned successfully' : 'Recruiter unassigned successfully');
      }
      
      // Refresh recruiter stats (this also refreshes availableRecruiters)
      // Use a debounced approach to prevent excessive API calls
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        fetchRecruiterStats().catch(error => {
          // Failed to refresh recruiter stats
        });
      }, 1000);
      
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timed out. Please try again.');
        } else {
          toast.error(`Failed to update recruiter assignment: ${error.message}`);
        }
      } else {
        toast.error('Failed to update recruiter assignment');
      }
      
      // Revert optimistic update
      setPositions(prevPositions);
    } finally {
      // Always ensure the assigning state is reset
      setAssigningRecruiter(null);
    }
  };

  const modulePermissions = session?.user?.modulePermissions || [];
  const canManagePositions = modulePermissions.includes('POSITIONS_EDIT_BASIC') || false;
  const canCreatePositions = modulePermissions.includes('POSITIONS_CREATE') || false;
  const canEditPositions = modulePermissions.includes('POSITIONS_EDIT_BASIC') || false;
  const canDeletePositions = modulePermissions.includes('POSITIONS_DELETE') || false;
  const canImportPositions = modulePermissions.includes('POSITIONS_IMPORT') || false;
  const canExportPositions = modulePermissions.includes('POSITIONS_EXPORT') || false;
  const canAssignPositionRecruiter = modulePermissions.includes('POSITIONS_RECRUITER_ASSIGN') || false;
  


  // Calculate total pages for pagination
  const totalPages = Math.ceil(total / pageSize);
  

  // Auto-reset search state if stuck for too long
  useEffect(() => {
    if (isSearching) {
      // Set a timeout to auto-reset search state after 10 seconds
      searchStuckTimeoutRef.current = setTimeout(() => {
        setIsSearching(false);
      }, 5000); // 5 seconds
    } else {
      // Clear timeout if search is not stuck
      if (searchStuckTimeoutRef.current) {
        clearTimeout(searchStuckTimeoutRef.current);
        searchStuckTimeoutRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (searchStuckTimeoutRef.current) {
        clearTimeout(searchStuckTimeoutRef.current);
      }
    };
  }, [isSearching]);

  // Auto-reset assigningRecruiter state if stuck for too long
  useEffect(() => {
    if (assigningRecruiter) {
      const timeout = setTimeout(() => {
        setAssigningRecruiter(null);
      }, 3000); // Reduced from 5 seconds to 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [assigningRecruiter]);

  // Global safety timeout to prevent page from getting stuck
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      // If any loading state is stuck for more than 30 seconds, reset it
      if (isLoading || isTableLoading || isSearching || isLoadingDepartments) {
        console.warn('Positions page loading states stuck for 30+ seconds, resetting...');
        setIsLoading(false);
        setIsTableLoading(false);
        setIsSearching(false);
        setIsLoadingDepartments(false);
        setAssigningRecruiter(null);
      }
    }, 5000); // 5 seconds

    return () => clearTimeout(globalTimeout);
  }, [isLoading, isTableLoading, isSearching, isLoadingDepartments]);

  // Use refs to store current values to avoid dependency issues
  const currentFiltersRef = useRef({ searchTerm, statusFilter, departmentFilter, selectedRecruiterId, page, pageSize });
  
  // Update refs when values change
  useEffect(() => {
    currentFiltersRef.current = { searchTerm, statusFilter, departmentFilter, selectedRecruiterId, page, pageSize };
  }, [searchTerm, statusFilter, departmentFilter, selectedRecruiterId, page, pageSize]);

  // Fetch all departments for the filter dropdown
  const fetchAllDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    try {
      const response = await fetch('/api/positions/all');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch departments: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format');
      }
      
      const departments = Array.from(new Set(data.data.map((p: any) => p.department)))
        .filter((d): d is string => typeof d === 'string' && !!d)
        .sort();
      
      setAllDepartments(departments);
    } catch (error) {
      // If the main API fails, try the fallback endpoint
      try {
        const fallbackResponse = await fetch('/api/positions?limit=1000');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackDepts = Array.from(new Set(fallbackData.data?.map((p: any) => p.department) || []))
            .filter((d): d is string => typeof d === 'string' && !!d)
            .sort();
          setAllDepartments(fallbackDepts);
        }
      } catch (fallbackError) {
        setAllDepartments([]);
      }
    } finally {
      setIsLoadingDepartments(false);
    }
  }, []); // Remove dependency on positions

  // Fetch positions with pagination and statistics
  const fetchPositions = useCallback(async (isSearch = false, customPage?: number) => {
    
    if (isSearch) {
      setIsSearching(true);
    } else if (isInitialLoadRef.current) {
      // Use full loading for initial load
      setIsLoading(true);
      isInitialLoadRef.current = false;
    } else {
      // Use table loading for subsequent loads (pagination, filters, etc.)
      setIsTableLoading(true);
    }
    
    try {
      const filters = currentFiltersRef.current;
      const query = new URLSearchParams();
      if (filters.searchTerm) query.append('title', filters.searchTerm);
      if (filters.statusFilter !== 'all') query.append('isOpen', filters.statusFilter === 'open' ? 'true' : 'false');
      if (filters.departmentFilter !== 'all') query.append('department', filters.departmentFilter);
      if (filters.selectedRecruiterId === 'unassigned') {
        query.append('recruiterId', 'null');
      } else if (filters.selectedRecruiterId) {
        query.append('recruiterId', filters.selectedRecruiterId);
      }
      query.append('limit', String(filters.pageSize));
      query.append('offset', String(((customPage ?? filters.page) - 1) * filters.pageSize));
      query.append('includeStats', 'true'); // Include statistics in the same call
      query.append('includeCandidateStats', 'true'); // Include candidate statistics for each position
      query.append('includeHeadcount', 'true'); // Include headcount data in the same call
      
      const url = `/api/positions?${query.toString()}`;
  
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      
      const data = await response.json();
      const positionsData = data.data || [];
      
     
      
      setPositions(positionsData);
      setTotal(data.total || 0);
      
      // Process headcount data from the API response
      if (positionsData.length > 0) {
        const headcountMap: { [positionId: string]: { total: number; vacant: number; filled: number } } = {};
        positionsData.forEach((position: Position & { headcountData?: any }) => {
          if (position.headcountData) {
            headcountMap[position.id] = {
              total: position.headcountData.total || 0,
              vacant: position.headcountData.vacant || 0,
              filled: position.headcountData.filled || 0
            };
          }
        });
        setHeadcountData(headcountMap);
      }
        
        // Update statistics if included in response
        if (data.statistics) {
          setStatistics(data.statistics);
        }
    } catch (error) {
      toast.error('Failed to load positions');
    } finally {
      // Always ensure search state is reset
      setIsSearching(false);
      if (isSearch) {
        // Search loading handled above
      } else {
        // Clear the appropriate loading state
        setIsTableLoading(false);
        setIsLoading(false);
      }
    }
  }, []); // Remove selectedRecruiterId dependency to prevent circular dependency

  // Dashboard update handler - defined after fetchPositions to avoid temporal dead zone
  const handleDashboardUpdate = useCallback((dashboardData: any) => {
    // Refresh the entire position list when dashboard updates
    if (dashboardData.type === 'position_list_update') {
      fetchPositions();
    }
  }, [fetchPositions]);

  // Simple SSE hook
  const { isConnected: realtimeConnected } = useEnhancedSSE();

  // Calculate vacant headcount from open positions
  useEffect(() => {
    let totalVacant = 0;
    let totalOpenPositions = 0;
    
    positions.forEach(position => {
      if (position.isOpen && headcountData[position.id]) {
        totalVacant += headcountData[position.id].vacant;
        totalOpenPositions += 1;
      }
    });
    
    setVacantFromOpenPositions({ vacant: totalVacant, totalOpen: totalOpenPositions });
  }, [positions, headcountData]);

  // Update URL with current pagination state
  const updateURL = useCallback((newPage: number, newPageSize?: number) => {
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('page', newPage.toString());
    if (newPageSize) {
      currentParams.set('pageSize', newPageSize.toString());
    }
    
    // Update URL without page refresh
    const newURL = `${window.location.pathname}?${currentParams.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [router]);

  // Calculate recruiter statistics from positions data
  const calculateRecruiterStats = useCallback((positionsData: Position[]) => {
    const stats: { [key: string]: number } = {};
    
    positionsData.forEach(position => {
      if (position.recruiterId) {
        stats[position.recruiterId] = (stats[position.recruiterId] || 0) + 1;
      } else {
        stats.unassigned = (stats.unassigned || 0) + 1;
      }
    });
    
    setRecruiterStats(stats);
  }, []);

  // Fetch recruiter statistics for all positions (regardless of current filter)
  const fetchRecruiterStats = useCallback(async () => {
    try {
      // Get recruiter headcount statistics
      const recruiterStatsResponse = await fetch('/api/users/recruiter-headcount-stats');
      
      if (!recruiterStatsResponse.ok) {
        const errorText = await recruiterStatsResponse.text();
        throw new Error(`Failed to fetch recruiter stats: ${recruiterStatsResponse.status} ${errorText}`);
      }
      
      const recruiterStatsData = await recruiterStatsResponse.json();
      
      // Set available recruiters with headcount data
      const availableRecruitersData = recruiterStatsData.recruiters.map((r: any) => ({ 
        id: r.id, 
        name: r.name, 
        avatarUrl: r.avatarUrl,
        vacantHeadcount: r.vacantHeadcount
      }));
      setAvailableRecruiters(availableRecruitersData);
      
      // Create stats object for backward compatibility
      const stats: { [key: string]: number } = {};
      recruiterStatsData.recruiters.forEach((recruiter: any) => {
        stats[recruiter.id] = recruiter.totalPositions;
      });
      stats.unassigned = recruiterStatsData.unassigned.totalPositions;
      stats.unassignedVacant = recruiterStatsData.unassigned.vacantHeadcount;
      
      setRecruiterStats(stats);
    } catch (error) {
      // Error fetching recruiter statistics
    }
  }, []);

  // Remove the separate fetchStatistics function since it's now combined
  // const fetchStatistics = useCallback(async () => { ... }, [searchTerm, statusFilter, departmentFilter]);

  // Initial load
  useEffect(() => {
    fetchPositions(false);
    fetchAllDepartments();
    // Only fetch recruiter stats if session is available
    if (session?.user?.id) {
      fetchRecruiterStats(); // Fetch recruiter stats independently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // Add session dependency

  // Fetch recruiter stats when session becomes available
  useEffect(() => {
    if (session?.user?.id && availableRecruiters.length === 0) {
      fetchRecruiterStats();
    }
  }, [session?.user?.id, availableRecruiters.length, fetchRecruiterStats]);

  // Effect for pagination changes only
  useEffect(() => {
    // Skip initial render and skip if search is in progress
    if (searchTimeoutRef.current) {
      return;
    }
    fetchPositions(false);
  }, [page, pageSize, fetchPositions]);

  // Listen for URL changes and update page state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const pageSizeParam = urlParams.get('pageSize');
    
    if (pageParam) {
      const newPage = parseInt(pageParam, 10);
      if (newPage !== page) {
        setPage(newPage);
      }
    }
    
    if (pageSizeParam) {
      const newPageSize = parseInt(pageSizeParam, 10);
      if (newPageSize !== pageSize) {
        setPageSize(newPageSize);
      }
    }
  }, [searchParams]); // Listen to searchParams changes

  // Improved debounced search effect with better performance and error handling
  useEffect(() => {

    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search with longer delay for better performance
    searchTimeoutRef.current = setTimeout(async () => {
      try {

        // Reset to first page and fetch with page 1
        setPage(1);
        updateURL(1); // Update URL to reflect page reset
        await fetchPositions(true, 1); // Pass custom page 1 to avoid race condition
      } catch (error) {
        setIsSearching(false);
      } finally {
        // Clear the timeout ref after execution
        searchTimeoutRef.current = null;
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm, statusFilter, departmentFilter, selectedRecruiterId, updateURL]); // Remove fetchPositions from dependencies

  // Handle search input focus and blur
  const handleSearchFocus = () => {
    // Ensure search input stays responsive
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle clear search with focus management
  const handleClearSearch = () => {
    setSearchTerm('');
    // Focus back to search input after clearing
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  // Handle search input change with better state management
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchTerm(value);
    
    // If search is stuck, force reset the search state
    if (isSearching && value === '') {
      setIsSearching(false);
    }
  };

  // Handle keyboard events to ensure search stays responsive
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow all keyboard input even during search
    if (e.key === 'Escape') {
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }
    
    // If search seems stuck, force a reset
    if (isSearching && e.key !== 'Escape') {
      // Allow the key press to continue
    }
  };

  // Handle search input blur to ensure proper state management
  const handleSearchBlur = () => {
    // Don't reset search state on blur, just ensure input is still functional
    // Clear any existing timeout
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
    }
    searchBlurTimeoutRef.current = setTimeout(() => {
      if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
        // Input lost focus, but don't disable it
      }
    }, 100);
  };

  // Use positions directly since filtering is now done server-side
  const filteredPositions = useMemo(() => positions, [positions]);

  // Memoize computed values for better performance
  const totalPositions = useMemo(() => statistics.total, [statistics.total]);
  const openPositions = useMemo(() => statistics.open, [statistics.open]);
  const closedPositions = useMemo(() => statistics.closed, [statistics.closed]);
  
  // Get selected recruiter name
  const selectedRecruiterName = useMemo(() => {
    if (!selectedRecruiterId || selectedRecruiterId === 'unassigned') return null;
    const recruiter = availableRecruiters.find(r => r.id === selectedRecruiterId);
    return recruiter?.name || null;
  }, [selectedRecruiterId, availableRecruiters]);
  
  const allSelected = useMemo(() => 
    selectedIds.length > 0 && selectedIds.length === filteredPositions.length, 
    [selectedIds.length, filteredPositions.length]
  );
  
  const someSelected = useMemo(() => 
    selectedIds.length > 0 && selectedIds.length < filteredPositions.length, 
    [selectedIds.length, filteredPositions.length]
  );

  // Add sort state and handler at the top of the component
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setSortColumn(null);
      setSortDirection('asc');
      return;
    }
    if (sortColumn === column && (direction === null || direction === undefined)) {
      // 3-state toggle: unsorted -> asc -> desc -> unsorted
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        // Clear sort - go back to unsorted
        setSortDirection(null);
      } else {
        // From unsorted (null) to asc
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection(direction || 'desc');
    }
  };

  const getSortableValue = (position: Position, column: string) => {
    switch (column) {
      case 'title': return position.title?.toLowerCase() || '';
      case 'department': return position.department?.toLowerCase() || '';
      case 'status': return position.isOpen ? 'open' : 'closed';
      case 'recruiter': return position.recruiterName?.toLowerCase() || '';
      default: return '';
    }
  };

  const sortedPositions = useMemo(() => {
    if (!sortColumn) return filteredPositions;
    return [...filteredPositions].sort((a, b) => {
      const aValue = getSortableValue(a, sortColumn);
      const bValue = getSortableValue(b, sortColumn);
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPositions, sortColumn, sortDirection]);

  // Handle add position
  const handleAddPosition = async (formData: AddPositionFormValues) => {
    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add position');
      }
      
      const newPosition = await response.json();
      setPositions(prev => [...prev, newPosition]);
      setIsAddModalOpen(false);
      toast.success('Position added successfully');
      // Refresh departments and recruiter stats in case a new department was added
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        fetchAllDepartments();
        fetchRecruiterStats();
      }, 500);
    } catch (error) {
      toast.error('Failed to add position');
    }
  };



  // Handle delete position
  const handleDeletePosition = async () => {
    if (!positionToDelete) return;
    
    try {
      const response = await fetch(`/api/positions/${positionToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete position');
      }
      
      setPositions(prev => prev.filter(p => p.id !== positionToDelete.id));
      setPositionToDelete(null);
      toast.success('Position deleted successfully');
      // Refresh recruiter stats after deletion
      fetchRecruiterStats();
    } catch (error) {
      toast.error('Failed to delete position');
    }
  };

  // Bulk selection logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredPositions.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };
  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };
  // Bulk delete handler
  const handleBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const response = await fetch(`/api/positions/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete');
      }));
      setPositions(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      toast.success('Selected positions deleted successfully');
      // Refresh recruiter stats after bulk deletion
      fetchRecruiterStats();
    } catch (error) {
      toast.error('Failed to delete some positions');
    }
  };

  const handleExportPositions = async () => {
    try {
      const response = await fetch('/api/positions/export', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export positions');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'positions-export.xlsx';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Positions exported successfully as Excel file');
    } catch (error) {
      toast.error('Failed to export positions');
    }
  };

  // Add refs for content
  const contentRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full positions-page-container">
      <div className="flex flex-1 overflow-hidden">
        {/* Recruiter Filter Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-background">
          <div className="h-full overflow-hidden p-4">
            <RecruiterFilterSidebar
              selectedRecruiterId={selectedRecruiterId}
              onRecruiterSelect={handleRecruiterSelect}
              recruiterStats={recruiterStats}
              recruiters={availableRecruiters}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 positions-content-area">
                      <div ref={contentRef} className="p-6 flex flex-col overflow-hidden h-full">
              {/* Filters on top */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              className="pl-10 pr-10 transition-all duration-200"
              ref={searchInputRef}
              autoComplete="off"
              spellCheck="false"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select 
            value={statusFilter || ''} 
            onValueChange={(value: 'all' | 'open' | 'closed') => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open Only</SelectItem>
              <SelectItem value="closed">Closed Only</SelectItem>
            </SelectContent>
          </Select>
                          {isLoadingDepartments ? (
                  <div className="w-full px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading departments...
                  </div>
                ) : allDepartments.length > 0 ? (
                  <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={departmentPopoverOpen} className="w-full justify-between text-xs font-normal shadow-none hover:shadow-none [&]:shadow-none [&]:hover:shadow-none" style={{ boxShadow: 'none' }}>
                        {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0 shadow-none" align="start">
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            placeholder="Search departments..."
                            value={departmentSearch}
                            onChange={(e) => setDepartmentSearch(e.target.value)}
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <CommandList>
                        
                          <div className="max-h-[200px] p-1">
                            <div
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                              onClick={() => handleDepartmentSelect('all')}
                            >
                              <Check className={`mr-2 h-4 w-4 ${departmentFilter === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                              All Departments
                            </div>
                            {allDepartments
                              .filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()))
                              .map(dept => (
                                <div
                                  key={dept}
                                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                  onClick={() => handleDepartmentSelect(dept)}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${departmentFilter === dept ? 'opacity-100' : 'opacity-0'}`} />
                                  {dept}
                                </div>
                              ))}
                          </div>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="w-full px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md border border-dashed">
                    <div className="flex items-center gap-2">
                      <span>No departments available</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-xs"
                        onClick={() => fetchAllDepartments()}
                        title="Retry loading departments"
                      >
                        <Loader2 className="h-3 w-3" />
                      </Button>
                    </div>
                  

                  </div>
                )}
        </div>
        {true && (
          <div className="flex gap-2">
            <Button onClick={() => setIsAddModalOpen(true)} className="btn-primary-gradient whitespace-nowrap">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Position
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Positions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPositions}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Search Status Indicator */}
      {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md flex-shrink-0">
          <Filter className="h-4 w-4" />
          <span>Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="text-xs">
              Title: "{searchTerm}"
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Status: {statusFilter === 'open' ? 'Open' : 'Closed'}
            </Badge>
          )}
          {departmentFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Department: {departmentFilter}
            </Badge>
          )}
          {selectedRecruiterId && (
            <Badge variant="secondary" className="text-xs">
              Recruiter: {selectedRecruiterId === 'unassigned' 
                ? 'Unassigned' 
                : selectedRecruiterName || 'Selected'
              }
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDepartmentFilter('all');
              setSelectedRecruiterId(null);
            }}
          >
            Clear all
          </Button>
        </div>
      )}



              {/* Stats Card */}
        <div className="grid grid-cols-1 gap-4 flex-shrink-0 my-6">
        {/* Vacant Headcount from Open Positions Card - Blue */}
        <Card
          className="group relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 backdrop-blur-sm"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Vacant Headcount from Open Positions
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {isLoadingHeadcount ? (
                      <Loader2 className="h-6 w-6 animate-spin inline" />
                    ) : (
                      vacantFromOpenPositions.vacant
                    )}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    vacant from {vacantFromOpenPositions.totalOpen} open position{vacantFromOpenPositions.totalOpen !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedRecruiterId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedRecruiterId === 'unassigned' 
                      ? 'Unassigned vacant headcount' 
                      : selectedRecruiterName 
                        ? `Vacant headcount for ${selectedRecruiterName}`
                        : 'Vacant headcount for selected recruiter'
                    }
                  </p>
                )}
              </div>
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center group-hover:scale-105 group-hover:rotate-2 transition-all duration-300 shadow-sm">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Positions List */}
      <div className="positions-table-container">
      {totalPositions === 0 ? (
        <div className="text-center py-12 empty-state">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No positions found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || selectedRecruiterId 
              ? 'Try adjusting your filters' 
              : 'Get started by adding your first position'}
          </p>
                          {canCreatePositions && !searchTerm && statusFilter === 'all' && departmentFilter === 'all' && !selectedRecruiterId && (
            <Button onClick={() => setIsAddModalOpen(true)} className="btn-primary-gradient">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add First Position
            </Button>
          )}
        </div>
      ) : (
        <div 
          className="border rounded-lg shadow overflow-hidden relative table-container-responsive"
        
        >
          
          {/* Table Loading Overlay */}
          {isTableLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading positions...</span>
              </div>
            </div>
          )}
          
          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-2 bg-muted/30 border-b border-border">
              <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
              <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteConfirm(true)} className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="h-7 px-2 text-muted-foreground hover:text-foreground">
                Clear
              </Button>
            </div>
          )}
          
          {/* Scrollable Table Container */}
          <div className="positions-table-scroll table-scrollbar">
            <Table className="min-w-full table-content-expandable">
            <TableHeader className="table-sticky-header">
              <TableRow>
                <TableHead key="row-number" className="w-8 min-w-[32px] text-center">#</TableHead>
                <TableHead key="select-all" className="w-12 min-w-[48px]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={e => handleSelectAll(e.target.checked)}
                    aria-label="Select all positions"
                  />
                </TableHead>
                <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('title'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Title
                    <DropdownMenu open={openMenu === 'title'} onOpenChange={open => setOpenMenu(open ? 'title' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'title' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('title'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('title'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('title', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('title', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>


                <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('status'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Status
                    <DropdownMenu open={openMenu === 'status'} onOpenChange={open => setOpenMenu(open ? 'status' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'status' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('status'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('status'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('status', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('status', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="inline-flex items-center gap-1">
                    Headcount
                  </span>
                </TableHead>
                <TableHead className="group cursor-pointer select-none hide-on-mobile" onClick={() => { handleSort('recruiter'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Recruiter
                    <DropdownMenu open={openMenu === 'recruiter'} onOpenChange={open => setOpenMenu(open ? 'recruiter' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'recruiter' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('recruiter'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('recruiter'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('recruiter', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('recruiter', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>

                <TableHead className="hide-on-mobile">Applied</TableHead>
                {isJobMatchEnabled && (
                  <TableHead className="hide-on-mobile">Potential Matched</TableHead>
                )}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPositions.map((position, index) => {
                const rowNumber = (page - 1) * pageSize + index + 1;
                return (
                <TableRow 
                  key={position.id} 
                  className="hover:bg-muted/50 transition-all duration-200 border-b border-border"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'fadeInUp 0.3s ease-out forwards'
                  }}
                >
                  <TableCell key={`${position.id}-row-number`} className="text-center font-mono text-xs text-muted-foreground">
                    {rowNumber}
                  </TableCell>
                  <TableCell key={`${position.id}-select`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(position.id)}
                      onChange={e => handleRowSelect(position.id, e.target.checked)}
                      aria-label={`Select position ${position.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium min-w-[200px]">
                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          setSelectedPositionId(position.id);
                          setIsNewDrawerOpen(true);
                        }}
                        className="text-primary hover:underline font-medium text-left cursor-pointer hover:text-primary/80 transition-colors flex items-start gap-1 group"
                        title="Click to view position details"
                                              >
                          {position.title}
                          {/* SLA badges inline with title */}
                          {position.isOpen && (() => {
                            const slaResult = checkSLAViolation(position);
                            const remaining = getSLARemainingDays(position);
                            if (slaResult && slaResult.isViolated) {
                              const variant = getSLABadgeVariant(slaResult.daysOverdue);
                              return (
                                <Badge variant={variant} className="ml-2 text-[10px] px-1.5 py-0.5">
                                  SLA overdue {slaResult.daysOverdue}d
                                </Badge>
                              );
                            }
                            if (remaining !== null && remaining <= 3 && remaining > 0) {
                              return (
                                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0.5">
                                  SLA due in {remaining}d
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          {position.grade && position.grade.color && (
                            <span 
                              className="inline text-xs px-1.5 py-0.5 rounded-full border ml-1"
                              style={{ 
                                borderColor: position.grade.color,
                                color: position.grade.color,
                                backgroundColor: 'transparent'
                              }}
                            >
                              {position.grade.name}
                            </span>
                          )}
                          {position.grade && !position.grade.color && (
                            <span className="inline text-xs text-muted-foreground ml-1">
                              {position.grade.name}
                            </span>
                          )}
                        <Eye className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </button>
                      {position.positionLevel && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {position.positionLevel}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {position.department}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {position.isOpen ? (
                      <Badge variant="success">Open</Badge>
                    ) : (
                      <Badge variant="destructive">Closed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isLoadingHeadcount ? (
                      <div className="flex justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : headcountData[position.id] ? (
                      <div className="flex items-center justify-center">
                        <Badge variant={headcountData[position.id].filled >= headcountData[position.id].total ? 'success' : 'secondary'} className="text-xs px-2 py-0.5">
                          {headcountData[position.id].filled}/{headcountData[position.id].total}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hide-on-mobile">
                    <RecruiterCell
                      position={position}
                      availableRecruiters={availableRecruiters}
                      canManagePositions={canAssignPositionRecruiter}
                      isAssigning={assigningRecruiter === position.id}
                      onAssignRecruiter={handleAssignRecruiterToPosition}
                      onResetAssigning={resetAssigningRecruiter}
                    />
                  </TableCell>
                  
                  <TableCell className="text-center hide-on-mobile">
                    {(position.candidateStats?.appliedStatusCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 rounded-md">
                        {position.candidateStats?.appliedStatusCount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-md">
                        0
                      </span>
                    )}
                  </TableCell>
                  {isJobMatchEnabled && (
                    <TableCell className="text-center hide-on-mobile">
                      {(position.candidateStats?.totalMatching ?? 0) > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-md">
                          {position.candidateStats?.totalMatching}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-md">
                          0
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                      <div className="flex items-center gap-2 action-buttons">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPositionId(position.id);
                          setIsEditDrawerOpen(true);
                        }}
                        title="Edit position"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {true && (
                        <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPositionToDelete(position)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
            </Table>
          </div>
        </div>
   
      )}
      </div>
      
      {/* Pagination Controls */}
      {(total > 0 || totalPages > 0) && (
        <div className="pagination-container">
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, totalPages)}
            pageSize={pageSize}
            total={total}
            onPageChange={(newPage) => {
              setPage(newPage);
              updateURL(newPage);
            }}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setPage(1);
              updateURL(1, newPageSize);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            showPageSizeSelector={true}
            className="mt-4"
          />
        </div>
      )}
          </div> {/* Close content div */}
        </div> {/* Close main content div */}
      </div> {/* Close flex container */}
      
      {/* Modals */}
      {true && (
        <AddPositionModal 
          isOpen={isAddModalOpen} 
          onOpenChange={setIsAddModalOpen} 
          onAddPosition={handleAddPosition}
        />
      )}
      {true && (
        <ImportPositionsModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImportSuccess={() => {
            fetchPositions();
            fetchRecruiterStats();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!positionToDelete} onOpenChange={() => setPositionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{positionToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePosition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Delete Positions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected position(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isNewDrawerOpen}
        onOpenChange={(open) => {
          setIsNewDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
          }
        }}
        positionId={selectedPositionId}
      />

      {/* Position Edit Drawer */}
      <PositionDetailDrawer
        isOpen={isEditDrawerOpen}
        onOpenChange={(open) => {
          setIsEditDrawerOpen(open);
          if (!open) {
            setEditingPositionId(null);
          }
        }}
        positionId={editingPositionId}
        initialEditMode={false}
      />
    </div>
  );
} 