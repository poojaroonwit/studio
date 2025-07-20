// Reusable drag-and-drop file upload area for selecting files
import React, { FC, useRef } from "react";
import { UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FileUploadAreaProps {
  accept: string;
  multiple: boolean;
  maxFileSize: number;
  onFilesChange: (files: FileList | null) => void;
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
}

export const FileUploadArea: FC<FileUploadAreaProps> = ({
  accept,
  multiple,
  maxFileSize,
  onFilesChange,
  dragActive,
  setDragActive,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    onFilesChange(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    onFilesChange(e.target.files);
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 h-full min-h-[300px] flex flex-col items-center justify-center relative ${
        dragActive 
          ? 'border-primary bg-primary/20 shadow-lg scale-105' 
          : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleInputChange}
        />
      </form>
      <UploadCloud className={`mx-auto mb-4 h-12 w-12 transition-all duration-300 ${
        dragActive ? 'text-primary scale-110' : 'text-primary'
      }`} />
      <p className={`text-lg font-medium mb-2 transition-all duration-300 ${
        dragActive ? 'text-primary font-semibold' : ''
      }`}>
        {dragActive ? 'Drop files here!' : 'Drag and drop files here'}
      </p>
      <p className="text-sm text-muted-foreground mb-4">or click to select files</p>
      <p className="text-xs text-muted-foreground">Accepted: {accept}. Max size: {maxFileSize / (1024 * 1024)}MB each.</p>
      
      {/* Drag overlay for better visual feedback */}
      {dragActive && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <UploadCloud className="mx-auto mb-2 h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm font-medium text-primary">Drop to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadArea; 