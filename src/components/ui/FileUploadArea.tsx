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
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    onFilesChange(e.target.files);
    // Reset the input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 h-full min-h-[300px] flex flex-col items-center justify-center ${
        dragActive 
          ? 'border-primary bg-primary/10' 
          : 'border-border bg-muted/30'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
      />
      <UploadCloud className="mx-auto mb-4 h-12 w-12 text-primary" />
      <p className="text-lg font-medium mb-2">Drag and drop files here</p>
      <p className="text-sm text-muted-foreground mb-4">or click to select files</p>
      <p className="text-xs text-muted-foreground">Accepted: {accept}. Max size: {maxFileSize / (1024 * 1024)}MB each.</p>
    </div>
  );
};

export default FileUploadArea; 