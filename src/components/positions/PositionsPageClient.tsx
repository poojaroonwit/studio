"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Briefcase, Edit, Trash2, Search, Filter, Loader2, ChevronLeft, ChevronRight, X, MoreVertical, ChevronUp, ChevronDown } from "lucide-react";
import type { Position } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { AddPositionModal, type AddPositionFormValues } from '@/components/positions/AddPositionModal';
import { EditPositionModal, type EditPositionFormValues } from '@/components/positions/EditPositionModal';
import Link from 'next/link';
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
import { ImportPositionsModal } from '@/components/positions/ImportPositionsModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronsUpDown, Check } from 'lucide-react';

export default function PositionsPageClient() {
  // All useState hooks first
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState({ total: 0, open: 0, closed: 0 });
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const { data: session } = useSession();
  // Debounce/search refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchStuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // statusFilter: initialize from URL only on first render
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>(() => {
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
    return 'all';
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
  }, [typeof window !== 'undefined' ? window.location.search : '']);

  // Department filter popover state
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Robust handler for department selection
  const handleDepartmentSelect = (dept: string) => {
    setDepartmentFilter(dept);
    setDepartmentPopoverOpen(false);
    setDepartmentSearch('');
  };

  const canManagePositions = session?.user?.role === 'Admin' || session?.user?.modulePermissions?.includes('POSITIONS_MANAGE');

  // Calculate total pages for pagination
  const totalPages = Math.ceil(total / pageSize);

  // Auto-reset search state if stuck for too long
  useEffect(() => {
    if (isSearching) {
      // Set a timeout to auto-reset search state after 10 seconds
      searchStuckTimeoutRef.current = setTimeout(() => {
        console.warn('Search stuck for too long, auto-resetting...');
        setIsSearching(false);
      }, 10000); // 10 seconds
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

  // Use refs to store current values to avoid dependency issues
  const currentFiltersRef = useRef({ searchTerm, statusFilter, departmentFilter, page, pageSize });
  
  // Update refs when values change
  useEffect(() => {
    currentFiltersRef.current = { searchTerm, statusFilter, departmentFilter, page, pageSize };
  }, [searchTerm, statusFilter, departmentFilter, page, pageSize]);

  // Fetch all departments for the filter dropdown
  const fetchAllDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/positions/all');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      const departments = Array.from(new Set(data.data.map((p: any) => p.department)))
        .filter((d): d is string => typeof d === 'string' && !!d)
        .sort();
      setAllDepartments(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to current positions if API fails
      setAllDepartments(Array.from(new Set(positions.map(p => p.department || "")))
        .filter((d): d is string => typeof d === 'string' && !!d)
        .sort());
    }
  }, [positions]);

  // Fetch positions with pagination and statistics
  const fetchPositions = useCallback(async (isSearch = false, customPage?: number) => {
    if (isSearch) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const filters = currentFiltersRef.current;
      const query = new URLSearchParams();
      if (filters.searchTerm) query.append('title', filters.searchTerm);
      if (filters.statusFilter !== 'all') query.append('isOpen', filters.statusFilter === 'open' ? 'true' : 'false');
      if (filters.departmentFilter !== 'all') query.append('department', filters.departmentFilter);
      query.append('limit', String(filters.pageSize));
      query.append('offset', String(((customPage ?? filters.page) - 1) * filters.pageSize));
      query.append('includeStats', 'true'); // Include statistics in the same call
      
      const response = await fetch(`/api/positions?${query.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      const data = await response.json();
      setPositions(data.data || []);
      setTotal(data.total || 0);
      
            // Update statistics if included in response
      if (data.statistics) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      toast.error('Failed to load positions');
      console.error('Error fetching positions:', error);
    } finally {
      // Always ensure search state is reset
      setIsSearching(false);
      if (!isSearch) {
        setIsLoading(false);
      }
    }
  }, []); // Empty dependency array makes this function stable

  // Remove the separate fetchStatistics function since it's now combined
  // const fetchStatistics = useCallback(async () => { ... }, [searchTerm, statusFilter, departmentFilter]);

  // Initial load
  useEffect(() => {
    fetchPositions(false);
    fetchAllDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Effect for pagination changes only
  useEffect(() => {
    // Skip initial render and skip if search is in progress
    if (searchTimeoutRef.current) {
      return;
    }
    fetchPositions(false);
  }, [page, pageSize]);

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
        await fetchPositions(true, 1); // Pass custom page 1 to avoid race condition
      } catch (error) {
        console.error('Search error:', error);
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
  }, [searchTerm, statusFilter, departmentFilter, fetchPositions]);

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
    setTimeout(() => {
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
    setTimeout(() => {
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleSort = (column: string | null, direction?: 'asc' | 'desc' | null) => {
    if (!column) {
      setSortColumn(null);
      setSortDirection('asc');
      return;
    }
    if (sortColumn === column && direction == null) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(direction || 'asc');
    }
  };

  const getSortableValue = (position: Position, column: string) => {
    switch (column) {
      case 'title': return position.title?.toLowerCase() || '';
      case 'department': return position.department?.toLowerCase() || '';
      case 'status': return position.isOpen ? 'open' : 'closed';
      case 'level': return position.positionLevel?.toLowerCase() || '';
      case 'created': return position.createdAt || '';
      case 'updated': return position.updatedAt || '';
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
      // Refresh departments in case a new department was added
      fetchAllDepartments();
    } catch (error) {
      toast.error('Failed to add position');
    }
  };

  // Handle edit position
  const handleEditPosition = async (positionId: string, data: EditPositionFormValues) => {
    try {
      const response = await fetch(`/api/positions/${positionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update position');
      }
      
      const updatedPosition = await response.json();
      setPositions(prev => prev.map(p => p.id === positionId ? updatedPosition.position : p));
      setIsEditModalOpen(false);
      setSelectedPosition(null);
      toast.success('Position updated successfully');
      // Refresh departments in case the department was changed
      fetchAllDepartments();
    } catch (error) {
      toast.error('Failed to update position');
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
    } catch (error) {
      toast.error('Failed to delete some positions');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Filters on top */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search positions..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              className={`pl-10 pr-10 transition-all duration-200 ${isSearching ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
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
            <SelectTrigger className={isSearching ? 'opacity-50' : ''}>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open Only</SelectItem>
              <SelectItem value="closed">Closed Only</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={departmentPopoverOpen} className="w-full mt-1 justify-between text-xs font-normal">
                {departmentFilter === 'all' ? 'All Departments' : departmentFilter}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Command>
                <CommandInput
                  placeholder="Search departments..."
                  value={departmentSearch}
                  onValueChange={setDepartmentSearch}
                  className="h-9 text-xs border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus-visible:ring-0"
                />
                <CommandList>
                  <CommandEmpty>{departmentSearch ? 'No departments found.' : 'Type to search departments.'}</CommandEmpty>
                  <ScrollArea className="max-h-48">
                    <CommandItem
                      key="all"
                      value="all"
                      onSelect={() => handleDepartmentSelect('all')}
                      onClick={() => handleDepartmentSelect('all')}
                      className="text-xs"
                    >
                      <Check className={departmentFilter === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                      All Departments
                    </CommandItem>
                    {allDepartments.filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase())).map(dept => (
                      <CommandItem
                        key={dept}
                        value={dept}
                        onSelect={() => handleDepartmentSelect(dept)}
                        onClick={() => handleDepartmentSelect(dept)}
                        className="text-xs"
                      >
                        <Check className={departmentFilter === dept ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                        {dept}
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {canManagePositions && (
          <div className="flex gap-2">
            <Button onClick={() => setIsAddModalOpen(true)} className="btn-primary-gradient whitespace-nowrap">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Position
            </Button>
            <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="whitespace-nowrap">
              Import Positions
            </Button>
          </div>
        )}
      </div>

      {/* Search Status Indicator */}
      {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
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
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDepartmentFilter('all');
              setIsSearching(false); // Force reset search state
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Search Stuck Indicator */}
      {isSearching && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Searching...</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs text-amber-600 hover:text-amber-700"
            onClick={() => {
              setIsSearching(false);
              // Clear stuck timeout
              if (searchStuckTimeoutRef.current) {
                clearTimeout(searchStuckTimeoutRef.current);
                searchStuckTimeoutRef.current = null;
              }
              // Force a new search
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              fetchPositions(true);
            }}
          >
            Reset
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Positions Card - Blue */}
        <Card
          className="group relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 backdrop-blur-sm"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Positions</p>
                <p className="text-2xl font-bold text-foreground">{totalPositions}</p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Open Positions Card - Green */}
        <Card
          className="group relative overflow-hidden border-2 border-green-200 dark:border-green-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 backdrop-blur-sm"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold text-foreground">{openPositions}</p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-green-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                <span className="text-white text-sm font-bold">O</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Closed Positions Card - Gray */}
        <Card
          className="group relative overflow-hidden border-2 border-gray-200 dark:border-gray-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Closed Positions</p>
                <p className="text-2xl font-bold text-foreground">{closedPositions}</p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-gray-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                <span className="text-white text-sm font-bold">C</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Positions List */}
      {totalPositions === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No positions found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Get started by adding your first position'}
          </p>
          {canManagePositions && !searchTerm && statusFilter === 'all' && departmentFilter === 'all' && (
            <Button onClick={() => setIsAddModalOpen(true)} className="btn-primary-gradient">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add First Position
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          {/* Loading Skeleton for Search */}
          {isSearching && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching positions...</span>
              </div>
            </div>
          )}
          
          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted border-b border-border">
              <span className="font-medium">{selectedIds.length} selected</span>
              <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Bulk Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Clear Selection
              </Button>
            </div>
          )}
          <Table className="min-w-full divide-y divide-border">
            <TableHeader>
              <TableRow>
                <TableHead>
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
                <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('level'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Level
                    <DropdownMenu open={openMenu === 'level'} onOpenChange={open => setOpenMenu(open ? 'level' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'level' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('level'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('level'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('level', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('level', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('department'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Department
                    <DropdownMenu open={openMenu === 'department'} onOpenChange={open => setOpenMenu(open ? 'department' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'department' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('department'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('department'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('department', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('department', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
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
                <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('created'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Created
                    <DropdownMenu open={openMenu === 'created'} onOpenChange={open => setOpenMenu(open ? 'created' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'created' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('created'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('created'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('created', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('created', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead className="group cursor-pointer select-none" onClick={() => { handleSort('updated'); setOpenMenu(null); }}>
                  <span className="inline-flex items-center gap-1">
                    Updated
                    <DropdownMenu open={openMenu === 'updated'} onOpenChange={open => setOpenMenu(open ? 'updated' : null)}>
                      <DropdownMenuTrigger asChild>
                        {sortColumn === 'updated' ? (
                          <button type="button" className="text-primary font-bold p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('updated'); }} aria-label="Sort options">
                            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : (
                          <button type="button" className="opacity-60 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); setOpenMenu('updated'); }} aria-label="Sort options">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleSort('updated', 'asc'); setOpenMenu(null); }}>Sort Ascending <ChevronUp size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleSort('updated', 'desc'); setOpenMenu(null); }}>Sort Descending <ChevronDown size={16} className="ml-1 inline" /></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { handleSort(null, null); setOpenMenu(null); }}>Clear Sort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPositions.map((position, index) => (
                <TableRow 
                  key={position.id} 
                  className="hover:bg-muted/50 transition-all duration-200"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: isSearching ? 'none' : 'fadeInUp 0.3s ease-out forwards'
                  }}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(position.id)}
                      onChange={e => handleRowSelect(position.id, e.target.checked)}
                      aria-label={`Select position ${position.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/positions/${position.id}`} className="text-primary hover:underline">
                      {position.title}
                    </Link>
                  </TableCell>
                  <TableCell>{position.positionLevel || '-'}</TableCell>
                  <TableCell>{position.department}</TableCell>
                  <TableCell>
                    {position.isOpen ? (
                      <Badge variant="success">Open</Badge>
                    ) : (
                      <Badge variant="destructive">Closed</Badge>
                    )}
                  </TableCell>
                  <TableCell>{position.createdAt ? new Date(position.createdAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{position.updatedAt ? new Date(position.updatedAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    {canManagePositions && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPosition(position);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPositionToDelete(position)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/positions/${position.id}`} passHref legacyBehavior>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="First page"
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                const newPageSize = Number(e.target.value);
                setPageSize(newPageSize);
                setPage(1); // Reset to first page when changing page size
              }}
              className="border rounded-md px-2 py-1 text-sm bg-background text-foreground"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Modals */}
      {canManagePositions && (
        <AddPositionModal 
          isOpen={isAddModalOpen} 
          onOpenChange={setIsAddModalOpen} 
          onAddPosition={handleAddPosition} 
        />
      )}
      {canManagePositions && (
        <ImportPositionsModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onImportSuccess={fetchPositions}
        />
      )}
      {canManagePositions && selectedPosition && (
        <EditPositionModal
          isOpen={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setSelectedPosition(null);
          }}
          onEditPosition={handleEditPosition}
          position={selectedPosition}
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
    </div>
  );
} 