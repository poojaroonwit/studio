"use client";

import React, { useState, type ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { FileUp, Loader2, Briefcase, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImportPositionsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImportSuccess: () => void; 
}

const ACCEPTED_FILE_TYPES = [
  '.csv',
  'text/csv'
].join(',');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_POSITIONS = 1000;

export function ImportPositionsModal({ isOpen, onOpenChange, onImportSuccess }: ImportPositionsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any>(null);
  
  // Refs for timeout cleanup
  const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (importTimeoutRef.current) {
        clearTimeout(importTimeoutRef.current);
      }
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const acceptedMimeTypes = ACCEPTED_FILE_TYPES.split(',');
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        setSelectedFile(null);
        event.target.value = '';
        return;
      }
      
      if (acceptedMimeTypes.includes(fileType) || fileName.endsWith('.csv')) {
        setSelectedFile(file);
        setImportStatus('idle');
        setProgress(0);
        setImportResults(null);
      } else {
        toast.error("Please select a CSV file (.csv). Only CSV files are supported.");
        setSelectedFile(null);
        event.target.value = '';
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file to import. Only CSV files are supported.");
      return;
    }

    // Clear any existing timeouts
    if (importTimeoutRef.current) {
      clearTimeout(importTimeoutRef.current);
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }

    setIsImporting(true);
    setImportStatus('uploading');
    setProgress(10);
    setImportResults(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      importTimeoutRef.current = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

      setImportStatus('processing');
      setProgress(30);

      const response = await fetch('/api/positions/import', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      // Clear import timeout on successful response
      if (importTimeoutRef.current) {
        clearTimeout(importTimeoutRef.current);
        importTimeoutRef.current = null;
      }
      setProgress(90);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to import positions. Status: ${response.status}`);
      }
      
      setImportResults(result);
      setImportStatus('completed');
      setProgress(100);

      // Show success message with details
      let successMessage = `Import completed successfully!`;
      if (result.success !== undefined && result.failed !== undefined) {
        successMessage += ` ${result.success} positions imported, ${result.failed} failed.`;
        if (result.processingTime) {
          successMessage += ` Processing time: ${(result.processingTime / 1000).toFixed(1)}s`;
        }
      }
      if (result.errors && result.errors.length > 0) {
        console.warn("Import warnings:", result.errors);
        if (result.errors.length <= 3) {
          successMessage += ` Warnings: ${result.errors.join(', ')}`;
        } else {
          successMessage += ` ${result.errors.length} warnings (check console for details)`;
        }
      }

      toast.success(successMessage);
      
      // Auto-close after showing results for 3 seconds
      autoCloseTimeoutRef.current = setTimeout(() => {
        onImportSuccess();
        onOpenChange(false);
        resetForm();
      }, 3000);

    } catch (error: any) {
      // Clear import timeout on error
      if (importTimeoutRef.current) {
        clearTimeout(importTimeoutRef.current);
        importTimeoutRef.current = null;
      }
      
      setImportStatus('error');
      setProgress(0);
      
      if (error.name === 'AbortError') {
        toast.error("Import timeout. The file may be too large or the server is busy. Please try again.");
      } else {
        console.error("Error importing positions:", error);
        toast.error(error.message || "An unexpected error occurred during import.");
      }
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, onImportSuccess, onOpenChange]);

  const resetForm = useCallback(() => {
    // Clear any existing timeouts
    if (importTimeoutRef.current) {
      clearTimeout(importTimeoutRef.current);
      importTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    
    setSelectedFile(null);
    setIsImporting(false);
    setProgress(0);
    setImportStatus('idle');
    setImportResults(null);
    const fileInput = document.getElementById('position-import-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleDownloadCsvTemplate = () => {
    const headers = [
      "title",
      "department",
      "description",
      "matchCriteria",
      "isOpen",
      "positionLevel",
      "custom_attributes"
    ];
    const exampleRows = [
      [
        "Software Engineer",
        "Engineering",
        "Develops software applications. Responsible for backend and frontend development.",
        "",
        "true",
        "Mid-Level",
        ""
      ],
      [
        "Product Manager",
        "Product",
        "Manages product lifecycle and leads product strategy.",
        "",
        "true",
        "Senior",
        ""
      ],
      [
        "Data Analyst",
        "Analytics",
        "Analyzes data and creates reports for business insights.",
        "",
        "true",
        "Junior",
        ""
      ],
      [
        "วิศวกรซอฟต์แวร์",
        "วิศวกรรม",
        "พัฒนาแอปพลิเคชันซอฟต์แวร์ รับผิดชอบการพัฒนาด้านหลังและด้านหน้า",
        "",
        "true",
        "ระดับกลาง",
        ""
      ]
    ];
    let csvContent = headers.join(',') + '\n';
    exampleRows.forEach(row => {
      csvContent += row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    csvContent += '\nNOTE: Save as UTF-8 encoding. isOpen should be true or false. positionLevel, description, matchCriteria, and custom_attributes are optional. If matchCriteria is empty, the default match criteria from system settings will be used. Avoid complex JSON in custom_attributes to prevent parsing issues.';
    // Ensure UTF-8 encoding with BOM for better compatibility with Thai language
    const utf8BOM = '\uFEFF';
    const blob = new Blob([utf8BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'positions_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = () => {
    switch (importStatus) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="mr-2 h-4 w-4 text-red-500" />;
      default:
        return <FileUp className="mr-2 h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (importStatus) {
      case 'uploading':
        return 'Uploading file...';
      case 'processing':
        return 'Processing positions...';
      case 'completed':
        return 'Import completed';
      case 'error':
        return 'Import failed';
      default:
        return 'Upload & Import';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-primary" /> Import Positions (CSV Only)
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file (.csv) containing position data.<br />
            <Button variant="link" className="p-0 h-auto text-primary underline" onClick={handleDownloadCsvTemplate}>
              Download CSV Template
            </Button>
            <br />
            <div className="mt-2 text-sm text-muted-foreground">
              <div>• Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB</div>
              <div>• Maximum positions: {MAX_POSITIONS}</div>
              <div>• Save as UTF-8 encoding for Thai language support</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="position-import-file">Select CSV File</Label>
            <Input
              id="position-import-file"
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="mt-1"
              disabled={isImporting}
            />
            {selectedFile && (
              <div className="text-sm text-muted-foreground mt-1">
                <div>Selected: {selectedFile.name}</div>
                <div>Size: {(selectedFile.size / 1024).toFixed(1)}KB</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Import Results</span>
                {importResults.processingTime && (
                  <span className="text-sm text-muted-foreground">
                    {(importResults.processingTime / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {importResults.success || 0} successful
                </div>
                <div className="flex items-center text-red-600">
                  <XCircle className="mr-1 h-3 w-3" />
                  {importResults.failed || 0} failed
                </div>
              </div>
              {importResults.errors && importResults.errors.length > 0 && (
                <div className="text-sm text-amber-600">
                  <div className="flex items-start">
                    <AlertCircle className="mr-1 h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{importResults.errors.length} warnings</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isImporting}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || isImporting}
            className="min-w-[120px]"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
