"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { sanitizeUrl } from "@/lib/security";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CloudArrowUpIcon as UploadCloud, ArrowDownTrayIcon as Download, ArrowPathIcon as Loader2, CheckCircleIcon as CheckCircle, XCircleIcon as XCircle, ExclamationCircleIcon as AlertCircle } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import FileUploadArea from "@/components/ui/FileUploadArea";

interface ApplicantImportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export default function ApplicantImportModal({ isOpen, onOpenChange, onImportSuccess }: ApplicantImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const fileName = file.name.toLowerCase();

      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        toast.error('Please select an Excel (.xlsx, .xls) or CSV file');
        return;
      }

      setSelectedFile(file);
    }
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch('/api/applicants/import');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'applicantS_import_template.xlsx';
      // SECURITY: Safe appendChild for file download - href is a blob URL, not user HTML
      const safeUrl = sanitizeUrl(url);
      if (safeUrl) {
        a.href = safeUrl;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/applicants/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          // Handle validation errors
          const errorMessages = result.details.map((detail: any) =>
            `Row ${detail.row} (${detail.email}): ${Object.values(detail.errors).flat().join(', ')}`
          );
          toast.error(`Import failed:\n${errorMessages.join('\n')}`);
        } else {
          throw new Error(result.error || 'Import failed');
        }
        return;
      }

      const { results } = result;
      const totalProcessed = results.created + results.updated + results.skipped;

      if (results.errors.length > 0) {
        toast.success(
          `Import completed with ${results.errors.length} errors. Created: ${results.created}, Updated: ${results.updated}`,
          { duration: 5000 }
        );
        console.error('Import errors:', results.errors);
      } else {
        toast.success(
          `Import completed successfully! Created: ${results.created}, Updated: ${results.updated}`,
          { duration: 4000 }
        );
      }

      // Reset form and close modal
      setSelectedFile(null);
      onOpenChange(false);

      // Trigger refresh
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error((error as Error).message || 'Failed to import Applicants');
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, onOpenChange, onImportSuccess]);

  const handleModalClose = useCallback((open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedFile(null);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[800px]" dialogId="Applicant-import-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Import Applicants
          </DialogTitle>
          <DialogDescription>
            Import Applicants from an Excel file. You can update existing Applicants by including their ID, or create new ones by leaving the ID field blank.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Template Download Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Step 1: Download Template</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="flex items-center gap-2"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download Template
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Download the template to see the required format</p>
                <p>• Fill in the data following the instructions</p>
                <p>• Leave ID blank for new Applicants, or provide existing ID for updates</p>
              </div>
            </div>

            {/* Right Column - File Upload Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Step 2: Upload File</h3>
              <FileUploadArea
                accept=".xlsx,.xls,.csv"
                multiple={false}
                maxFileSize={10 * 1024 * 1024} // 10MB
                onFilesChange={handleFileSelect}
                dragActive={dragActive}
                setDragActive={setDragActive}
              />

              {selectedFile && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Import Instructions - Full Width */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Import Instructions</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                <div>
                  <p className="font-medium text-blue-700">ID Field:</p>
                  <p>• Leave blank to create new Applicants</p>
                  <p>• Provide existing UUID to update Applicants</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-700">Required Fields:</p>
                  <p>• Name* and Email* are required for all Applicants</p>
                  <p>• Status* is required (defaults to "Applied" if not provided)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <p className="font-medium text-green-700">JSON Fields:</p>
                  <p>• Education, Experience, Skills, and Custom Attributes should be valid JSON</p>
                  <p>• Use the template as a reference for proper formatting</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={isImporting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                Import Applicants
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

