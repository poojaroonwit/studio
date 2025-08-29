"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { 
  BrainCircuit, 
  Zap, 
  Loader2, 
  Copy, 
  X,
  FileText,
  Sparkles,
  RefreshCw,
  Download,
  FileDown,
  ChevronDown,
  Save,
  Edit
} from 'lucide-react';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GenerativeAIModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId?: string;
  candidateName?: string;
  onRefresh?: () => void;
}

export function GenerativeAIModal({ 
  isOpen, 
  onOpenChange, 
  candidateId, 
  candidateName,
  onRefresh
}: GenerativeAIModalProps) {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSavingToAttachment, setIsSavingToAttachment] = useState(false);
  const [showFileNameDialog, setShowFileNameDialog] = useState(false);
  const [fileName, setFileName] = useState('');

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(systemPrompts.map(prompt => prompt.categoryName))];
    return ['all', ...uniqueCategories];
  }, [systemPrompts]);

  useEffect(() => {
    if (isOpen) {
      fetchSystemPrompts();
    }
  }, [isOpen]);

  const fetchSystemPrompts = async () => {
    try {
      setIsLoadingPrompts(true);
      const response = await fetch('/api/settings/system-prompts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemPrompts(data);
      } else {
        toast.error('Failed to fetch system prompts');
      }
    } catch (error) {
      console.error('Error fetching system prompts:', error);
      toast.error('Failed to fetch system prompts');
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPrompt) {
      toast.error('Please select a system prompt first');
      return;
    }

    try {
      setIsGenerating(true);
      
      // Prepare context data
      const contextData = {
        candidateId,
        systemPrompt: selectedPrompt.content,
        promptName: selectedPrompt.name,
        promptCategory: selectedPrompt.categoryName
      };

      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(contextData),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.content || '');
        toast.success('Content generated successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      // Strip HTML tags for plain text copy
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = generatedContent;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(plainText);
      toast.success('Content copied to clipboard');
    } catch (error) {
      console.error('Error copying content:', error);
      toast.error('Failed to copy content');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Create a blob with the HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Generated Content</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
            h1, h2, h3 { color: #333; }
            ul, ol { margin: 10px 0; }
            li { margin: 5px 0; }
            p { margin: 10px 0; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            blockquote { border-left: 4px solid #ddd; margin: 10px 0; padding-left: 20px; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          ${generatedContent}
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Use browser's print functionality to save as PDF
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast.success('PDF download initiated - use browser print dialog to save as PDF');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadWord = async () => {
    try {
      // Convert HTML to Word-compatible format
      const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Generated Content</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>90</w:Zoom>
              <w:DoNotPromptForConvert/>
              <w:DoNotShowRevisions/>
              <w:DoNotPrintRevisions/>
              <w:DisplayHorizontalDrawingGridEvery>0</w:DisplayHorizontalDrawingGridEvery>
              <w:DisplayVerticalDrawingGridEvery>2</w:DisplayVerticalDrawingGridEvery>
              <w:UseMarginsForDrawingGridOrigin/>
              <w:ValidateAgainstSchemas/>
              <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
              <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
              <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
              <w:Compatibility>
                <w:BreakWrappedTables/>
                <w:SnapToGridInCell/>
                <w:WrapTextWithPunct/>
                <w:UseAsianBreakRules/>
                <w:DontGrowAutofit/>
              </w:Compatibility>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body { font-family: 'IBM Plex Sans Thai', 'Inter', Arial, Helvetica, sans-serif; line-height: 1.6; font-size: 11pt; }
            h1, h2, h3 { color: #333; font-weight: 600; }
            h1 { font-size: 18pt; margin: 20px 0 10px 0; }
            h2 { font-size: 16pt; margin: 18px 0 8px 0; }
            h3 { font-size: 14pt; margin: 16px 0 6px 0; }
            ul, ol { margin: 10px 0; padding-left: 20px; }
            li { margin: 5px 0; }
            p { margin: 10px 0; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10pt; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: 600; }
            blockquote { border-left: 4px solid #ddd; margin: 10px 0; padding-left: 20px; font-style: italic; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
            strong { font-weight: 600; }
            em { font-style: italic; }
          </style>
        </head>
        <body>
          ${generatedContent}
        </body>
        </html>
      `;
      
      const blob = new Blob([wordContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-content-${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Word document downloaded');
    } catch (error) {
      console.error('Error downloading Word document:', error);
      toast.error('Failed to download Word document');
    }
  };

  const handleSaveToAttachment = async () => {
    if (!candidateId || !generatedContent) {
      toast.error('No content to save or candidate ID missing');
      return;
    }

    // Generate default filename and show dialog
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFileName = selectedPrompt 
      ? `${selectedPrompt.name}-${candidateName || 'Candidate'}-${timestamp}.doc`
      : `AI-Generated-${candidateName || 'Candidate'}-${timestamp}.doc`;
    
    setFileName(defaultFileName);
    setShowFileNameDialog(true);
  };

  const handleConfirmSaveToAttachment = async () => {
    if (!fileName.trim()) {
      toast.error('Please enter a filename');
      return;
    }

    // Ensure filename has .doc extension
    const finalFileName = fileName.trim().endsWith('.doc') ? fileName.trim() : `${fileName.trim()}.doc`;

    try {
      setIsSavingToAttachment(true);
      
      const response = await fetch('/api/ai/save-word-to-attachment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          candidateId,
          content: generatedContent,
          fileName: finalFileName,
          promptName: selectedPrompt?.name || 'Generated Content'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Word document saved to candidate attachments successfully');
        // Refresh the candidate detail to show the new attachment
        if (onRefresh) {
          onRefresh();
        }
        setShowFileNameDialog(false);
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save to attachments');
      }
    } catch (error) {
      console.error('Error saving to attachment:', error);
      toast.error('Failed to save to attachments');
    } finally {
      setIsSavingToAttachment(false);
    }
  };

  const filteredPrompts = systemPrompts.filter(prompt => {
    return selectedCategory === 'all' || prompt.categoryName === selectedCategory;
  });

  const handleClose = () => {
    setSelectedPrompt(null);
    setGeneratedContent('');
    setIsSavingToAttachment(false);
    setShowFileNameDialog(false);
    setFileName('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] h-full flex flex-col overflow-visible">
          <div className="flex items-start justify-between mb-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                Generative AI Assistant
              </DialogTitle>
              <DialogDescription>
                Select a system prompt and generate AI-powered content for {candidateName || 'the candidate'}.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 gap-6">
            {/* Left Panel - System Prompts */}
            <div className="w-1/3 flex flex-col border-r pr-6 min-h-0">
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Filter by Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoadingPrompts ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredPrompts.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No system prompts found</p>
                  </div>
                ) : (
                  filteredPrompts.map((prompt) => (
                    <Card 
                      key={prompt.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPrompt?.id === prompt.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-500' 
                          : ''
                      }`}
                      onClick={() => setSelectedPrompt(prompt)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Sparkles className="h-3 w-3 text-primary" />
                              {prompt.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {prompt.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {prompt.categoryName}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={prompt.isActive ? "default" : "secondary"} className="text-xs">
                            {prompt.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel - Generated Content */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Generated Content</h3>
                  <div className="flex items-center gap-2">
                    {selectedPrompt && (
                      <Badge variant="secondary" className="text-xs">
                        Using: {selectedPrompt.name}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleGenerate} 
                    disabled={!selectedPrompt || isGenerating}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Content'}
                  </Button>
                  {generatedContent && (
                    <>
                      <Button 
                        onClick={handleCopy} 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy to clipboard
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Download
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[10003] relative" style={{ zIndex: 10003 }}>
                          <DropdownMenuItem onClick={handleDownloadPDF}>
                            <Download className="h-4 w-4 mr-2" />
                            Download as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDownloadWord}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Download as Word
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={handleSaveToAttachment}
                            disabled={isSavingToAttachment}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Save to Attachments
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        onClick={() => setGeneratedContent('')} 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                <TiptapEditor
                  value={generatedContent}
                  onChange={setGeneratedContent}
                  placeholder="Generated content will appear here..."
                  className="flex-1 h-full"
                  readOnly={false}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filename Edit Dialog */}
      <Dialog open={showFileNameDialog} onOpenChange={setShowFileNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Filename
            </DialogTitle>
            <DialogDescription>
              Customize the filename before saving to candidate attachments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter filename..."
                className="w-full"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The file will be saved as a Word document (.doc)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowFileNameDialog(false)}
              disabled={isSavingToAttachment}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSaveToAttachment}
              disabled={isSavingToAttachment || !fileName.trim()}
              className="flex items-center gap-2"
            >
              {isSavingToAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSavingToAttachment ? 'Saving...' : 'Save to Attachments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
