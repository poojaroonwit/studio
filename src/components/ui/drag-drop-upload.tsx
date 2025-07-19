import React, { useState, useCallback, useRef } from 'react';
import { UploadCloud, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { Badge } from './badge';

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface DragDropUploadProps {
  onUpload: (files: File[], onProgress?: (fileId: string, progress: number) => void) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onUpload,
  accept = "application/pdf,.doc,.docx,.rtf",
  multiple = true,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  className = ""
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxFileSize && file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`;
    }
    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      console.error('File validation errors:', errors);
    }

    if (validFiles.length > 0) {
      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'pending'
      }));

      setUploadFiles(prev => {
        const combined = [...prev, ...newUploadFiles];
        return combined.slice(0, maxFiles);
      });

      return validFiles;
    }

    return [];
  }, [maxFileSize, maxFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const validFiles = processFiles(files);
      if (validFiles.length > 0) {
        handleUpload(validFiles);
      }
    }
  }, [disabled, processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = processFiles(files);
      if (validFiles.length > 0) {
        handleUpload(validFiles);
      }
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleUpload = async (files: File[]) => {
    try {
      // Create progress tracking function
      const onProgress = (fileId: string, progress: number) => {
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress, status: progress === 100 ? 'completed' : 'uploading' }
              : f
          )
        );
      };

      // Update status to uploading
      setUploadFiles(prev => 
        prev.map(f => 
          files.some(file => file.name === f.file.name) 
            ? { ...f, status: 'uploading' }
            : f
        )
      );

      await onUpload(files, onProgress);
      
      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      // Mark failed uploads
      setUploadFiles(prev => 
        prev.map(f => 
          files.some(file => file.name === f.file.name) 
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary' as const;
      case 'uploading':
        return 'default' as const;
      case 'completed':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag and Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-105 shadow-lg' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <UploadCloud className={`mx-auto h-12 w-12 mb-4 transition-all duration-200 ${isDragOver ? 'text-primary scale-110' : 'text-muted-foreground'}`} />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, DOC, DOCX, RTF (max {Math.round(maxFileSize / 1024 / 1024)}MB each)
          </p>
          {multiple && (
            <p className="text-xs text-muted-foreground">
              You can upload multiple files at once
            </p>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Upload Progress ({uploadFiles.filter(f => f.status === 'uploading').length} uploading)
          </h4>
          <div className="space-y-2">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
                {getStatusIcon(uploadFile.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(uploadFile.file.size / 1024)} KB
                      </span>
                      <Badge variant={getStatusBadgeVariant(uploadFile.status)} className="text-xs">
                        {uploadFile.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={uploadFile.progress} className="h-2" />
                  {uploadFile.status === 'uploading' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {uploadFile.progress}% complete
                    </p>
                  )}
                  {uploadFile.error && (
                    <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropUpload; 