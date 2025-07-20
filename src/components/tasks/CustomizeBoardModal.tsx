import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { List, LayoutGrid, Settings, Eye, EyeOff, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const candidateFields = [
  { key: 'none', label: 'None', icon: '🚫' },
  { key: 'status', label: 'Status', icon: '📊' },
  { key: 'recruiterId', label: 'Recruiter', icon: '👤' },
  { key: 'positionId', label: 'Position', icon: '💼' },
  { key: 'fitScore', label: 'Fit Score', icon: '🎯' },
  { key: 'applicationDate', label: 'Application Date', icon: '📅' },
  { key: 'name', label: 'Name', icon: '👨‍💼' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'phone', label: 'Phone', icon: '📞' },
];

interface CustomizeBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowFieldValues?: string[];
  columnFieldValues?: string[];
}

// Enhanced MultiSelect with better UX
function MultiSelect({ 
  options, 
  selected, 
  onChange, 
  placeholder,
  maxHeight = "200px"
}: { 
  options: string[]; 
  selected: string[]; 
  onChange: (vals: string[]) => void; 
  placeholder?: string;
  maxHeight?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure options are valid strings
  const validOptions = options.filter(option => 
    typeof option === 'string' && option.trim() !== ''
  );

  const filteredOptions = validOptions.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === filteredOptions.length) {
      onChange([]);
    } else {
      onChange(filteredOptions);
    }
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter(v => v !== value));
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <div
        className={cn(
          "border rounded-lg px-3 py-2 min-h-[44px] flex flex-wrap gap-1 items-center bg-background cursor-pointer transition-all duration-200",
          "hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
          open && "ring-2 ring-primary/20 border-primary/50"
        )}
        onClick={() => setOpen(!open)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        {selected.length === 0 && (
          <span className="text-muted-foreground text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {placeholder || 'Select values to show...'}
          </span>
        )}
        {selected.map(val => (
          <Badge 
            key={val} 
            variant="secondary" 
            className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {val}
            <button 
              type="button" 
              className="ml-1 text-primary/60 hover:text-primary transition-colors" 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleRemove(val); 
              }}
              aria-label={`Remove ${val}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", open && "rotate-180")} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Select All */}
          {filteredOptions.length > 0 && (
            <div className="p-2 border-b">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                className="w-full text-left px-2 py-1 text-sm text-primary hover:bg-accent rounded-md transition-colors flex items-center gap-2"
              >
                <Checkbox 
                  checked={selected.length === filteredOptions.length && filteredOptions.length > 0}
                  className="w-4 h-4"
                />
                <span className="font-medium">
                  {selected.length === filteredOptions.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
            </div>
          )}

          {/* Options */}
          <ScrollArea className="max-h-[300px] min-h-[100px]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {validOptions.length === 0 ? 'No values available' : 'No values found'}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelect(val); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
                      selected.includes(val) 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-accent"
                    )}
                  >
                    <Checkbox 
                      checked={selected.includes(val)}
                      className="w-4 h-4"
                    />
                    <span className="truncate">{val}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// Dynamically extract custom fields from candidates
function getCustomFieldKeys(candidates: any[]): string[] {
  const keys = new Set<string>();
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  safeCandidates.forEach(c => {
    if (c.customAttributes && typeof c.customAttributes === 'object') {
      Object.keys(c.customAttributes).forEach(k => keys.add(k));
    }
  });
  return Array.from(keys);
}

export function CustomizeBoardModal({ open, onOpenChange, rowFieldValues = [], columnFieldValues = [] }: CustomizeBoardModalProps) {
  console.log('CustomizeBoardModal: Component rendered with props:', {
    open,
    rowFieldValues,
    columnFieldValues
  });
  
  // Filter out empty values from props
  const cleanRowFieldValues = (rowFieldValues || []).filter(val => 
    typeof val === 'string' && val.trim() !== ''
  );
  const cleanColumnFieldValues = (columnFieldValues || []).filter(val => 
    typeof val === 'string' && val.trim() !== ''
  );
  
  console.log('CustomizeBoardModal - Received values:', {
    rowFieldValues,
    columnFieldValues,
    cleanRowFieldValues,
    cleanColumnFieldValues
  });
  
  // State for actual data
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Dynamically build candidateFields including custom fields
  const customFieldKeys = getCustomFieldKeys(candidates);
  const dynamicCandidateFields = [
    ...candidateFields,
    ...customFieldKeys.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), icon: '📝' }))
  ];
  const validCandidateFields = dynamicCandidateFields.filter(f => f.key && f.key.trim() !== '');
  
  // Get all possible values for each field type using actual data
  const getAllPossibleValues = (fieldKey: string) => {
    switch (fieldKey) {
      case 'none':
        return ['No grouping'];
      case 'status':
        return stages.length > 0 ? stages : ['Applied', 'Screening', 'Interview Scheduled', 'Interviewing', 'Offer Sent', 'Offer Accepted', 'Hired', 'Rejected', 'Withdrawn'];
      case 'recruiterId':
        return recruiters.length > 0 ? recruiters.map(r => r.name || r.id) : ['No recruiters available'];
      case 'positionId':
        return positions.length > 0 ? positions.map(p => p.title || p.id) : ['No positions available'];
      case 'fitScore':
        if (candidates.length > 0) {
          const scores = candidates.map(c => c.fitScore).filter(s => typeof s === 'number');
          if (scores.length > 0) {
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            return [
              `${min}-${Math.round((min + max) / 4)}`,
              `${Math.round((min + max) / 4) + 1}-${Math.round((min + max) / 2)}`,
              `${Math.round((min + max) / 2) + 1}-${Math.round((min + max) * 3 / 4)}`,
              `${Math.round((min + max) * 3 / 4) + 1}-${max}`
            ];
          }
        }
        return ['0-20', '21-40', '41-60', '61-80', '81-100'];
      case 'applicationDate':
        if (candidates.length > 0) {
          const dates = candidates.map(c => c.applicationDate).filter(d => d);
          if (dates.length > 0) {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            
            return [
              'This Week',
              'Last Week', 
              'This Month',
              'Last Month',
              'Older'
            ];
          }
        }
        return ['This Week', 'Last Week', 'This Month', 'Last Month', 'Older'];
      case 'name':
        if (candidates.length > 0) {
          const names = candidates.map(c => c.name).filter(n => n);
          if (names.length > 0) {
            const firstLetters = [...new Set(names.map(n => n.charAt(0).toUpperCase()))].sort();
            if (firstLetters.length > 1) {
              const midPoint = Math.ceil(firstLetters.length / 2);
              return [
                `${firstLetters[0]}-${firstLetters[midPoint - 1]}`,
                `${firstLetters[midPoint]}-${firstLetters[firstLetters.length - 1]}`
              ];
            }
          }
        }
        return ['A-M', 'N-Z'];
      case 'email':
        if (candidates.length > 0) {
          const emails = candidates.map(c => c.email).filter(e => e);
          if (emails.length > 0) {
            const domains = [...new Set(emails.map(e => e.split('@')[1]))].slice(0, 5);
            return domains.length > 0 ? domains : ['Company A', 'Company B', 'Company C'];
          }
        }
        return ['Company A', 'Company B', 'Company C'];
      case 'phone':
        if (candidates.length > 0) {
          const phones = candidates.map(c => c.phone).filter(p => p);
          if (phones.length > 0) {
            const available = phones.filter(p => p && p.trim() !== '').length;
            const unavailable = phones.length - available;
            return [
              `Available (${available})`,
              `Not Available (${unavailable})`
            ];
          }
        }
        return ['Available', 'Not Available'];
      default:
        // For any other field, check both root and customAttributes
        if (candidates.length > 0) {
          const values = candidates.map(c => c[fieldKey] ?? c.customAttributes?.[fieldKey]).filter(v => v !== null && v !== undefined && v !== '');
          const uniqueValues = [...new Set(values)];
          return uniqueValues.length > 0 ? uniqueValues : cleanRowFieldValues.length > 0 ? cleanRowFieldValues : ['Option 1', 'Option 2', 'Option 3'];
        }
        return cleanRowFieldValues.length > 0 ? cleanRowFieldValues : ['Option 1', 'Option 2', 'Option 3'];
    }
  };
  
  const [rowField, setRowField] = useState('status');
  const [columnField, setColumnField] = useState('recruiterId');
  const [visibleRowValues, setVisibleRowValues] = useState<string[]>([]);
  const [visibleColumnValues, setVisibleColumnValues] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'row' | 'column'>('row');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { show: toast } = useToast();

  // Load preferences on open
  useEffect(() => {
    if (!open) return;
    
    console.log('CustomizeBoardModal: Modal opened, loading preferences...');
    setInitializing(true);
    fetch('/api/settings/user-preferences')
      .then(res => {
        console.log('CustomizeBoardModal: User preferences response status:', res.status);
        return res.json();
      })
      .then(prefs => {
        console.log('CustomizeBoardModal: Loaded preferences:', prefs);
        const rowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_rowField');
        const colPref = prefs.find((p: any) => p.attributeKey === 'mytasks_columnField');
        const visibleRowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleRowValues');
        const visibleColPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleColumnValues');
        
        console.log('CustomizeBoardModal: Found preferences:', {
          rowPref,
          colPref,
          visibleRowPref,
          visibleColPref,
          cleanRowFieldValues,
          cleanColumnFieldValues
        });
        
        if (rowPref) setRowField(rowPref.customNote || 'status');
        if (colPref) setColumnField(colPref.customNote || 'recruiterId');
        
        // Set default values for visible values - will be updated when data is loaded
        if (visibleRowPref) {
          try {
            const savedValues = JSON.parse(visibleRowPref.customNote) || [];
            setVisibleRowValues(savedValues);
          } catch {
            setVisibleRowValues([]);
          }
        } else {
          setVisibleRowValues([]);
        }
        
        if (visibleColPref) {
          try {
            const savedValues = JSON.parse(visibleColPref.customNote) || [];
            setVisibleColumnValues(savedValues);
          } catch {
            setVisibleColumnValues([]);
          }
        } else {
          setVisibleColumnValues([]);
        }
      })
      .catch((error) => {
        console.error('CustomizeBoardModal: Error loading preferences:', error);
        // Fallback to defaults
        console.log('CustomizeBoardModal: Error loading preferences, using defaults');
        setVisibleRowValues([]);
        setVisibleColumnValues([]);
      })
      .finally(() => setInitializing(false));
  }, [open]);

  // Update visible values when data is loaded and fields change
  useEffect(() => {
    if (open && !initializing && (recruiters.length > 0 || positions.length > 0 || stages.length > 0 || candidates.length > 0)) {
      // Only update if we have data and the modal is not initializing
      const rowValues = getAllPossibleValues(rowField);
      const colValues = getAllPossibleValues(columnField);
      
      // Only update if current values are empty or different
      if (visibleRowValues.length === 0 || JSON.stringify(visibleRowValues) !== JSON.stringify(rowValues)) {
        setVisibleRowValues(rowValues);
      }
      if (visibleColumnValues.length === 0 || JSON.stringify(visibleColumnValues) !== JSON.stringify(colValues)) {
        setVisibleColumnValues(colValues);
      }
    }
  }, [rowField, columnField, open, recruiters, positions, stages, candidates, initializing]);

  // Fetch actual data when modal opens
  useEffect(() => {
    if (!open) return;
    
    console.log('CustomizeBoardModal: Fetching actual data...');
    const fetchActualData = async () => {
      try {
        // Fetch recruiters
        console.log('CustomizeBoardModal: Fetching recruiters...');
        const recruitersRes = await fetch('/api/users?role=Recruiter');
        const recruitersData = await recruitersRes.json();
        console.log('CustomizeBoardModal: Recruiters response:', recruitersData);
        setRecruiters(Array.isArray(recruitersData) ? recruitersData : []);
        
        // Fetch positions
        console.log('CustomizeBoardModal: Fetching positions...');
        const positionsRes = await fetch('/api/positions');
        const positionsData = await positionsRes.json();
        console.log('CustomizeBoardModal: Positions response:', positionsData);
        setPositions(Array.isArray(positionsData.data) ? positionsData.data : []);
        
        // Fetch stages
        console.log('CustomizeBoardModal: Fetching stages...');
        const stagesRes = await fetch('/api/settings/recruitment-stages');
        const stagesData = await stagesRes.json();
        console.log('CustomizeBoardModal: Stages response:', stagesData);
        setStages(Array.isArray(stagesData) ? stagesData.map((s: any) => s.name) : []);
        
        // Fetch candidates to get unique values
        console.log('CustomizeBoardModal: Fetching candidates...');
        const candidatesRes = await fetch('/api/candidates');
        const candidatesData = await candidatesRes.json();
        console.log('CustomizeBoardModal: Candidates response:', candidatesData);
        setCandidates(Array.isArray(candidatesData) ? candidatesData : (candidatesData.data || []));
        
        console.log('CustomizeBoardModal: Fetched actual data:', {
          recruiters: recruitersData,
          positions: positionsData,
          stages: stagesData,
          candidates: candidatesData
        });
      } catch (error) {
        console.error('CustomizeBoardModal: Error fetching actual data:', error);
      }
    };
    
    fetchActualData();
  }, [open]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setInitializing(false);
      // Reset data when modal closes to prevent stale data
      setRecruiters([]);
      setPositions([]);
      setStages([]);
      setCandidates([]);
    }
  }, [open]);

  const handleSave = async () => {
    console.log('CustomizeBoardModal: Starting save process...');
    console.log('CustomizeBoardModal: Current state:', {
      rowField,
      columnField,
      visibleRowValues,
      visibleColumnValues
    });
    setLoading(true);
    try {
      const prefs = [
        { modelType: 'Candidate', attributeKey: 'mytasks_rowField', uiPreference: 'Standard', customNote: rowField },
        { modelType: 'Candidate', attributeKey: 'mytasks_columnField', uiPreference: 'Standard', customNote: columnField },
        { modelType: 'Candidate', attributeKey: 'mytasks_visibleRowValues', uiPreference: 'Standard', customNote: JSON.stringify(visibleRowValues) },
        { modelType: 'Candidate', attributeKey: 'mytasks_visibleColumnValues', uiPreference: 'Standard', customNote: JSON.stringify(visibleColumnValues) },
      ];
      
      console.log('CustomizeBoardModal: Saving preferences:', prefs);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch('/api/settings/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('CustomizeBoardModal: Save response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('CustomizeBoardModal: Save failed:', res.status, errorText);
        throw new Error(`Failed to save preferences: ${res.status} ${errorText}`);
      }
      
      const result = await res.json();
      console.log('CustomizeBoardModal: Save successful:', result);
      
      toast("Preferences saved! Your board customization has been applied.", {
        duration: 4000,
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
      });
      
      // Close modal
      onOpenChange(false);
    } catch (err: any) {
      console.error('CustomizeBoardModal: Error saving preferences:', err);
      
      let errorMessage = "Failed to save preferences";
      if (err.name === 'AbortError') {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast(errorMessage, {
        duration: 4000,
        style: {
          background: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
          border: '1px solid hsl(var(--destructive))',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldIcon = (key: string) => {
    return dynamicCandidateFields.find(f => f.key === key)?.icon || '📋';
  };

  const getFieldLabel = (key: string) => {
    return dynamicCandidateFields.find(f => f.key === key)?.label || key;
  };

  // Validate candidateFields before rendering
  // validCandidateFields is now dynamic, so we can use it directly
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5" />
            Customize Board Layout
            {initializing && <span className="text-sm text-muted-foreground">(Loading...)</span>}
          </DialogTitle>
          <DialogDescription className="text-base">
            Configure how your task board is organized. Choose which attributes to use for rows and columns, 
            and select which specific values to display. Select "None" to hide a dimension.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'row' | 'column')} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-6 flex-shrink-0">
              <TabsTrigger value="row" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Row Configuration
              </TabsTrigger>
              <TabsTrigger value="column" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Column Configuration
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <TabsContent value="row" className="space-y-6 pb-8">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="text-lg">{getFieldIcon(rowField)}</span>
                      Row Attribute
                    </Label>
                    <Select value={rowField || 'status'} onValueChange={setRowField}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select row attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {validCandidateFields.map(f => (
                          <SelectItem key={f.key} value={f.key} className="flex items-center gap-2">
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Choose which attribute to group your board rows by. Select "None" to show all candidates without row grouping.
                    </p>
                  </div>

                  {rowField !== 'none' && (
                    <div>
                      <Label className="text-sm font-medium mb-2">
                        Values to Display
                      </Label>
                      <MultiSelect
                        options={getAllPossibleValues(rowField)}
                        selected={visibleRowValues}
                        onChange={setVisibleRowValues}
                        placeholder={`Select ${getFieldLabel(rowField).toLowerCase()} values to show...`}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Select which specific values to display as rows. Only selected values will appear on your board.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="column" className="space-y-6 pb-8">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span className="text-lg">{getFieldIcon(columnField)}</span>
                      Column Attribute
                    </Label>
                    <Select value={columnField || 'recruiterId'} onValueChange={setColumnField}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select column attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        {validCandidateFields.map(f => (
                          <SelectItem key={f.key} value={f.key} className="flex items-center gap-2">
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Choose which attribute to group your board columns by. Select "None" to show all candidates without column grouping.
                    </p>
                  </div>

                  {columnField !== 'none' && (
                    <div>
                      <Label className="text-sm font-medium mb-2">
                        Values to Display
                      </Label>
                      <MultiSelect
                        options={getAllPossibleValues(columnField)}
                        selected={visibleColumnValues}
                        onChange={setVisibleColumnValues}
                        placeholder={`Select ${getFieldLabel(columnField).toLowerCase()} values to show...`}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Select which specific values to display as columns. Only selected values will appear on your board.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Changes will be applied immediately to your board
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading || initializing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading || initializing}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : initializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}