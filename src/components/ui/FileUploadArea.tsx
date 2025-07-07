// Reusable drag-and-drop file upload area for selecting files
import React, { FC } from "react";
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
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
    onFilesChange(e.target.files);
  };
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 h-full min-h-[300px] flex flex-col items-center justify-center ${
        dragActive 
          ? 'border-primary bg-primary/10' 
          : 'border-border bg-muted/30'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-upload-area-input')?.click()}
      style={{ cursor: 'pointer' }}
    >
      <Input
        id="file-upload-area-input"
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