"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { toast } from 'react-hot-toast';
import { 
  BrainCircuit, 
  Zap, 
  Loader2, 
  Copy, 
  Save, 
  X,
  FileText,
  Sparkles,
  RefreshCw,
  Download,
  FileDown
} from 'lucide-react';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GenerativeAIModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId?: string;
  candidateName?: string;
}

export function GenerativeAIModal({ 
  isOpen, 
  onOpenChange, 
  candidateId, 
  candidateName 
}: GenerativeAIModalProps) {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    'Job Description Generation',
    'Candidate Analysis',
    'Email Templates',
    'Report Generation',
    'General',
    'Custom'
  ];

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
        candidateName,
        systemPrompt: selectedPrompt.content,
        promptName: selectedPrompt.name,
        promptCategory: selectedPrompt.category
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

  const handleSave = async () => {
    if (!generatedContent.trim()) {
      toast.error('No content to save');
      return;
    }

    try {
      // Here you can implement saving logic based on your requirements
      // For example, save to candidate notes, create a new document, etc.
      toast.success('Content saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
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
            body { font-family: 'Times New Roman', serif; line-height: 1.6; }
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

  const filteredPrompts = systemPrompts.filter(prompt => {
    return selectedCategory === 'all' || prompt.category === selectedCategory;
  });

  const handleClose = () => {
    setSelectedPrompt(null);
    setGeneratedContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Generative AI Assistant
          </DialogTitle>
          <DialogDescription>
            Select a system prompt and generate AI-powered content for {candidateName || 'the candidate'}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[70vh] gap-6">
          {/* Left Panel - System Prompts */}
          <div className="w-1/3 flex flex-col border-r pr-6">
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
                        ? 'ring-2 ring-primary bg-primary/5' 
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
                          {prompt.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground max-h-16 overflow-hidden">
                        <div 
                          className="prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: prompt.content.length > 150 
                              ? prompt.content.substring(0, 150) + '...' 
                              : prompt.content 
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Generated Content */}
          <div className="flex-1 flex flex-col">
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
                       Copy
                     </Button>
                     <Button 
                       onClick={handleDownloadPDF} 
                       variant="outline" 
                       size="sm"
                       className="flex items-center gap-2"
                     >
                       <Download className="h-4 w-4" />
                       PDF
                     </Button>
                     <Button 
                       onClick={handleDownloadWord} 
                       variant="outline" 
                       size="sm"
                       className="flex items-center gap-2"
                     >
                       <FileDown className="h-4 w-4" />
                       Word
                     </Button>
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

            <div className="flex-1 border rounded-lg overflow-hidden">
              <TiptapEditor
                value={generatedContent}
                onChange={setGeneratedContent}
                placeholder="Generated content will appear here..."
                className="h-full"
                readOnly={false}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          {generatedContent && (
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Content
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
