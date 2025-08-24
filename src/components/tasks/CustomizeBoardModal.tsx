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
];

interface CustomizeBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowFieldValues?: string[];
  columnFieldValues?: string[];
}

// Enhanced MultiSelect with better UX
function MultiSelect({ 
  options, // now: { key, label, icon }[]
  selected, 
  onChange, 
  placeholder,
  maxHeight = "200px"
}: { 
  options: { key: string, label: string, icon?: any }[]; 
  selected: string[]; 
  onChange: (vals: string[]) => void; 
  placeholder?: string;
  maxHeight?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure options are valid objects with key
  const validOptions = options.filter(option => 
    option && typeof option.key === 'string' && option.key.trim() !== ''
  );

  const filteredOptions = validOptions.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || option.key.toLowerCase().includes(searchTerm.toLowerCase())
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
      onChange(filteredOptions.map(opt => opt.key));
    }
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter(v => v !== value));
  };

  return (
    <div className="relative z-[500]">
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
        {selected.map(val => {
          const opt = validOptions.find(o => o.key === val);
          return (
            <Badge 
              key={val} 
              variant="secondary" 
              className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {opt ? opt.label : val}
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
          );
        })}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground ml-auto transition-transform", open && "rotate-180")} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[500] mt-1 w-full bg-popover border rounded-lg shadow-lg">
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
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {validOptions.length === 0 ? 'No values available' : 'No values found'}
            </div>
          ) : (
            <div style={{ maxHeight: 400, minHeight: 100, overflowY: 'auto' }}>
              <div className="p-1">
                {filteredOptions.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelect(opt.key); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
                      selected.includes(opt.key) 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-accent"
                    )}
                  >
                    <Checkbox 
                      checked={selected.includes(opt.key)}
                      className="w-4 h-4"
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div 
          className="fixed inset-0 z-[499]" 
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

// Helper to extract all unique keys (including nested) from parsedData using dot notation
function getParsedDataKeys(candidates: any[]): string[] {
  const keys = new Set<string>();
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  function extractKeys(obj: any, prefix = '') {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(k => {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        keys.add(fullKey);
        extractKeys(obj[k], fullKey);
      });
    }
  }
  safeCandidates.forEach(c => {
    if (c.parsedData && typeof c.parsedData === 'object') {
      extractKeys(c.parsedData);
    }
  });
  return Array.from(keys);
}

export function CustomizeBoardModal({ open, onOpenChange, rowFieldValues = [], columnFieldValues = [] }: CustomizeBoardModalProps) {

  
  // Filter out empty values from props
  const cleanRowFieldValues = (rowFieldValues || []).filter(val => 
    typeof val === 'string' && val.trim() !== ''
  );
  const cleanColumnFieldValues = (columnFieldValues || []).filter(val => 
    typeof val === 'string' && val.trim() !== ''
  );

  
  // State for actual data
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Fetch actual data when modal opens
  useEffect(() => {
    if (!open) return;
    setInitializing(true);
    const fetchActualData = async () => {
      try {
        // Fetch recruiters
        const recruitersRes = await fetch('/api/users?role=Recruiter');
        if (!recruitersRes.ok) throw new Error('Failed to fetch recruiters');
        const recruitersData = await recruitersRes.json();
        // Handle the correct API response structure: { users: [...], pagination: {...} }
        const recruitersArray = recruitersData?.users || [];
        setRecruiters(Array.isArray(recruitersArray) ? recruitersArray : []);
        // Fetch positions
        const positionsRes = await fetch('/api/positions/all');
        if (!positionsRes.ok) throw new Error('Failed to fetch positions');
        const positionsData = await positionsRes.json();
        setPositions(positionsData.data || []);
        // Fetch stages
        const stagesRes = await fetch('/api/recruitment-stages');
        if (!stagesRes.ok) throw new Error('Failed to fetch stages');
        const stagesData = await stagesRes.json();
        setStages(Array.isArray(stagesData) ? stagesData.map((s: any) => s.name) : []);
        // Fetch candidates to get unique values
        const candidatesRes = await fetch('/api/candidates?limit=1000');
        if (!candidatesRes.ok) throw new Error('Failed to fetch candidates');
        const candidatesData = await candidatesRes.json();
        setCandidates(Array.isArray(candidatesData) ? candidatesData : (candidatesData.data || []));
      } catch (error) {
        console.error('CustomizeBoardModal: Error fetching actual data:', error);
      } finally {
        setInitializing(false);
      }
    };
    fetchActualData();
  }, [open]);

  // Always recalculate field options on every render so new candidates/fields are included
  const customFieldKeys = getCustomFieldKeys(candidates);
  const parsedDataKeys = getParsedDataKeys(candidates);
  const allFieldKeys = new Set([
    ...candidateFields.map(f => f.key),
    ...customFieldKeys
  ]);
  const parsedDataFieldObjs = parsedDataKeys
    .filter(key => !allFieldKeys.has(key))
    .map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), icon: '📝' }));
  const dynamicCandidateFields = [
    ...candidateFields,
    ...customFieldKeys.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), icon: '📝' })),
    ...parsedDataFieldObjs
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
            if (min === max) {
              // All scores are the same, show standard buckets
              return ['0-20', '21-40', '41-60', '61-80', '81-100'];
            }
            if (max - min <= 1) {
              // Only 0 and 1 or very small range, just show unique values
              return Array.from(new Set(scores)).map(v => v.toString());
            }
            // Normal bucket logic
            return [
              `${min}-${Math.round((min + max) / 4)}`,
              `${Math.round((min + max) / 4) + 1}-${Math.round((min + max) / 2)}`,
              `${Math.round((min + max) / 2) + 1}-${Math.round((min + max) * 3 / 4)}`,
              `${Math.round((min + max) * 3 / 4) + 1}-${max}`
            ];
          }
        }
        return ['0-20', '21-40', '41-60', '61-80', '81-100'];

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

  // Add state for visibleFields
  const [visibleFields, setVisibleFields] = useState<string[]>(['name', 'email', 'status', 'fitScore']);

  // Load preferences on open
  useEffect(() => {
    if (!open) return;
    
  
    setInitializing(true);
    fetch('/api/settings/user-preferences')
      .then(res => {
     
        return res.json();
      })
      .then(prefs => {
        
        const rowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_rowField');
        const colPref = prefs.find((p: any) => p.attributeKey === 'mytasks_columnField');
        const visibleRowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleRowValues');
        const visibleColPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleColumnValues');
        const visibleFieldsPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleFields');
        
      
        
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

        if (visibleFieldsPref) {
          try {
            const savedFields = JSON.parse(visibleFieldsPref.customNote) || [];
            setVisibleFields(savedFields);
          } catch {
            setVisibleFields(['name', 'email', 'status', 'fitScore']);
          }
        } else {
          setVisibleFields(['name', 'email', 'status', 'fitScore']);
        }
      })
      .catch((error) => {
       
        setVisibleRowValues([]);
        setVisibleColumnValues([]);
        setVisibleFields(['name', 'email', 'status', 'fitScore']);
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

  // When building rowAndColumnFields, filter out 'name', 'email', and 'phone'
  const baseRowColumnFields = [
    ...candidateFields.filter(f => !['name', 'email', 'phone'].includes(f.key)),
    ...customFieldKeys
      .filter(key => !['name', 'email', 'phone'].includes(key))
      .map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), icon: '📝' })),
    ...parsedDataFieldObjs.filter(f => !['name', 'email', 'phone'].includes(f.key))
  ];
  
  // Remove duplicates by key to prevent selection issues
  const seenKeys = new Set<string>();
  const rowAndColumnFields = baseRowColumnFields.filter(field => {
    if (seenKeys.has(field.key)) {

      return false;
    }
    seenKeys.add(field.key);
    return true;
  });
  
  // Debug logging
  
  
  // For card fields: candidateFields + customFieldKeys + parsedDataFields
  const cardFields = [
    ...rowAndColumnFields,
    ...parsedDataFieldObjs.filter(f => ['name', 'email', 'phone'].includes(f.key))
  ];

  // Ensure rowField/columnField are always valid
  useEffect(() => {
    if (!open) return;
    // If current rowField/columnField is not in options, fallback
    if (rowAndColumnFields.length > 0) {
      if (!rowAndColumnFields.some(f => f.key === rowField)) {
        setRowField('status');
      }
      if (!rowAndColumnFields.some(f => f.key === columnField)) {
        setColumnField('recruiterId');
      }
    }
  }, [open, rowAndColumnFields.length]);

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

  
    setLoading(true);
    try {
      const rowValuesToSave = rowField === 'none' ? [] : visibleRowValues;
      const prefs = [
        { modelType: 'Candidate', attributeKey: 'mytasks_rowField', uiPreference: 'Standard', customNote: rowField },
        { modelType: 'Candidate', attributeKey: 'mytasks_columnField', uiPreference: 'Standard', customNote: columnField },
        { modelType: 'Candidate', attributeKey: 'mytasks_visibleRowValues', uiPreference: 'Standard', customNote: JSON.stringify(rowValuesToSave) },
        { modelType: 'Candidate', attributeKey: 'mytasks_visibleColumnValues', uiPreference: 'Standard', customNote: JSON.stringify(visibleColumnValues) },
        { modelType: 'Candidate', attributeKey: 'mytasks_visibleFields', uiPreference: 'Standard', customNote: JSON.stringify(visibleFields) },
      ];
      
      
      
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
      
    
      
      if (!res.ok) {
        const errorText = await res.text();
       
        throw new Error(`Failed to save preferences: ${res.status} ${errorText}`);
      }
      
      const result = await res.json();
      
      
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
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col gap-6 p-0 overflow-visible">
        <DialogHeader className="p-6 pb-0 border-b flex-shrink-0 bg-card rounded-t-xl">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Settings className="w-6 h-6" />
            Customize Board Layout
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Configure how your task board is organized and which fields are visible on each card.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-visible px-6 py-4 flex flex-col gap-8">
          {/* Board Grouping Section */}
          <div className="bg-muted/40 rounded-xl p-6 shadow-sm border flex flex-col gap-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <LayoutGrid className="w-5 h-5" /> Board Grouping
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row Grouping */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <List className="w-4 h-4" /> Row Attribute
                </Label>
                <Select 
                  value={rowField || 'status'} 
                  onValueChange={setRowField}
                  key={`row-select-${rowAndColumnFields.length}`}
                  disabled={initializing || loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select row attribute" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {rowAndColumnFields.map(f => (
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
                {rowField !== 'none' && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2">Row Values</Label>
                    <MultiSelect
                      options={getAllPossibleValues(rowField).map(val => ({ key: val, label: val, icon: '📋' }))}
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
              {/* Column Grouping */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <LayoutGrid className="w-4 h-4" /> Column Attribute
                </Label>
                <Select 
                  value={columnField || 'recruiterId'} 
                  onValueChange={setColumnField}
                  key={`column-select-${rowAndColumnFields.length}`}
                  disabled={initializing || loading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select column attribute" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {rowAndColumnFields.map(f => (
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
                {columnField !== 'none' && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2">Column Values</Label>
                    <MultiSelect
                      options={getAllPossibleValues(columnField).map(val => ({ key: val, label: val, icon: '📋' }))}
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
            </div>
          </div>
          {/* Card Fields Section */}
          <div className="bg-muted/40 rounded-xl p-6 shadow-sm border flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5" /> Card Fields to Show
            </h2>
            <MultiSelect
              options={cardFields.map(f => ({ key: f.key, label: f.label, icon: f.icon }))}
              selected={visibleFields}
              onChange={setVisibleFields}
              placeholder="Select fields to show on each card..."
              maxHeight="400px"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Choose which fields are visible on each candidate card in the board view. Drag to reorder in the future.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-auto  bottom-0 left-0 right-0 bg-card border-t p-4 flex-shrink-0 rounded-b-xl z-10">
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