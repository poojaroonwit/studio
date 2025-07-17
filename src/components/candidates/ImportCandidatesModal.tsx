"use client";

import { useState, type ChangeEvent } from 'react';
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
import { useToast } from '../../hooks/use-toast';
import { FileUp, Loader2, Users, Download, FileText, AlertCircle } from 'lucide-react';
import type { Candidate } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportCandidatesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImportSuccess: () => void;
}

const ACCEPTED_EXCEL_TYPES = [
  '.xlsx',
  '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
].join(',');

// Helper function to download file
function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function ImportCandidatesModal({ isOpen, onOpenChange, onImportSuccess }: ImportCandidatesModalProps) {
  const { show, error, success } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const acceptedMimeTypes = ACCEPTED_EXCEL_TYPES.split(',');
      
      if (acceptedMimeTypes.includes(fileType) || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        error("Invalid File Type: Please select an Excel file (.xlsx, .xls)." );
        setSelectedFile(null);
        event.target.value = '';
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch('/api/candidates/import/template');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'candidate_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      success('Import template downloaded successfully!');
    } catch (error: any) {
      error(`Failed to download template: ${error.message}`);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      error("No File Selected: Please select an Excel file to import.");
      return;
    }
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/candidates/import', {
        method: 'POST',
        body: formData, // Send as FormData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to import candidates. Status: ${response.status}`);
      }

      let successMessage = `Import process completed.`;
      if (result.success !== undefined && result.failed !== undefined) {
        successMessage += ` ${result.success} candidates imported successfully. ${result.failed} failed.`;
        if (result.errors && result.errors.length > 0) {
          console.error("Import errors:", result.errors);
          successMessage += " Check console for details on failures."
        }
      }

      success(`Import Complete: ${successMessage}`);
      onImportSuccess();
      onOpenChange(false);
      setSelectedFile(null);
      const fileInput = document.getElementById('candidate-excel-import') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Error importing candidates:", error);
      error(`Import Failed: ${error.message || "An unexpected error occurred during import."}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setSelectedFile(null);
        setIsImporting(false);
        const fileInput = document.getElementById('candidate-excel-import') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" /> Import Candidates
          </DialogTitle>
          <DialogDescription>
            Import candidates using our Excel template. Download the template first to ensure proper formatting.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Template Download Section */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium mb-1">Step 1: Download Template</h4>
                <p className="text-sm text-muted-foreground">
                  Download our Excel template with proper formatting and example data.
                </p>
              </div>
              <Button 
                onClick={handleDownloadTemplate} 
                disabled={isDownloadingTemplate}
                variant="outline"
                size="sm"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloadingTemplate ? 'Downloading...' : 'Download Template'}
              </Button>
            </div>
          </div>

          {/* Instructions Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Required fields:</strong> Name, Email, Status<br/>
              <strong>Optional fields:</strong> Phone, Position ID, Recruiter ID, Fit Score, Application Date, Location, Introduction, Education, Experience, Skills, Job Suitable, Custom Attributes<br/>
              <strong>Format:</strong> Use the downloaded template for proper formatting. JSON fields should contain valid JSON strings.
            </AlertDescription>
          </Alert>

          {/* File Upload Section */}
          <div>
            <Label htmlFor="candidate-excel-import">Step 2: Select Excel File</Label>
            <Input
              id="candidate-excel-import"
              type="file"
              accept={ACCEPTED_EXCEL_TYPES}
              onChange={handleFileChange}
              className="mt-1"
            />
            {selectedFile && (
              <div className="mt-2 flex items-center text-sm text-muted-foreground">
                <FileText className="mr-2 h-4 w-4" />
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800">Processing import...</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Upload & Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    