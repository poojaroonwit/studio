"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TipTapEditor, 
  MinimalistEditor, 
  MarkdownEditor, 
  WysiwygEditorSelector,
  CompactEditor 
} from '@/components/ui/wysiwyg-editors';
import { Button } from '@/components/ui/button';
import { Checkbox, ThreeStateCheckbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Zap, 
  Palette, 
  Code, 
  Type, 
  Eye,
  Copy,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const sampleContent = `
<h1>Job Description: Senior Software Engineer</h1>
<p><strong>About the Role:</strong></p>
<p>We are looking for a talented Senior Software Engineer to join our dynamic team. You will be responsible for developing high-quality software solutions and mentoring junior developers.</p>

<h2>Key Responsibilities:</h2>
<ul>
<li>Design and implement scalable software solutions</li>
<li>Collaborate with cross-functional teams</li>
<li>Mentor junior developers</li>
<li>Write clean, maintainable code</li>
</ul>

<h2>Requirements:</h2>
<ol>
<li>5+ years of experience in software development</li>
<li>Strong knowledge of React, Node.js, and TypeScript</li>
<li>Experience with cloud platforms (AWS/Azure)</li>
<li>Excellent problem-solving skills</li>
</ol>

<p><em>This is an exciting opportunity to work on cutting-edge technologies!</em></p>
`;

const markdownSample = `# Job Description: Senior Software Engineer

## About the Role:
We are looking for a talented **Senior Software Engineer** to join our dynamic team. You will be responsible for developing high-quality software solutions and mentoring junior developers.

## Key Responsibilities:
- Design and implement scalable software solutions
- Collaborate with cross-functional teams  
- Mentor junior developers
- Write clean, maintainable code

## Requirements:
1. 5+ years of experience in software development
2. Strong knowledge of React, Node.js, and TypeScript
3. Experience with cloud platforms (AWS/Azure)
4. Excellent problem-solving skills

*This is an exciting opportunity to work on cutting-edge technologies!*
`;

export default function WysiwygDemoPage() {
  const [tiptapContent, setTipTapContent] = useState(sampleContent);
  const [minimalistContent, setMinimalistContent] = useState(sampleContent);
  const [markdownContent, setMarkdownContent] = useState(markdownSample);
  const [compactContent, setCompactContent] = useState(sampleContent);
  const [selectorContent, setSelectorContent] = useState(sampleContent);
  
  // Checkbox demo states
  const [checkboxState, setCheckboxState] = useState<'unchecked' | 'checked' | 'indeterminate'>('unchecked');
  const [regularChecked, setRegularChecked] = useState(false);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard!');
  };

  const downloadHtml = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  };

  const getStateLabel = (state: 'unchecked' | 'checked' | 'indeterminate') => {
    switch (state) {
      case 'unchecked': return 'Unchecked';
      case 'checked': return 'Checked';
      case 'indeterminate': return 'Indeterminate';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">WYSIWYG Editor & Checkbox Demo</h1>
        <p className="text-muted-foreground">Explore different editor types and the new cycling checkbox functionality</p>
      </div>

      {/* Checkbox Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-green-500" />
            Cycling Checkbox Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regular Checkbox */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Regular Checkbox</h3>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="regular-checkbox" 
                  checked={regularChecked}
                  onCheckedChange={checked => setRegularChecked(checked === true)}
                />
                <Label htmlFor="regular-checkbox">Regular checkbox with green styling</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                State: <Badge variant={regularChecked ? "default" : "secondary"}>
                  {regularChecked ? "Checked" : "Unchecked"}
                </Badge>
              </p>
            </div>

            {/* Cycling Checkbox */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cycling Checkbox</h3>
              <div className="flex items-center space-x-2">
                <ThreeStateCheckbox 
                  id="cycling-checkbox" 
                  value={checkboxState}
                  onValueChange={setCheckboxState}
                />
                <Label htmlFor="cycling-checkbox">Click to cycle through states</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                State: <Badge variant="outline" className="capitalize">
                  {getStateLabel(checkboxState)}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Cycle: Unchecked → Checked → Indeterminate → Unchecked
              </p>
            </div>
          </div>

          <Separator />

          {/* Multiple Checkboxes Demo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Multiple Checkboxes Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Task 1', 'Task 2', 'Task 3'].map((task, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox id={`task-${index}`} />
                  <Label htmlFor={`task-${index}`} className="text-sm">{task}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* WYSIWYG Editors Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">WYSIWYG Editors</h2>
          <p className="text-muted-foreground">Different editor types for various use cases</p>
        </div>

        {/* TipTap Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              TipTap Editor (Full Featured)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TipTapEditor
              value={tiptapContent}
              onChange={setTipTapContent}
              placeholder="Start typing your content..."
            />
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(tiptapContent)} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
              <Button onClick={() => downloadHtml(tiptapContent, 'tiptap-content.html')} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Minimalist Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Minimalist Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MinimalistEditor
              value={minimalistContent}
              onChange={setMinimalistContent}
              placeholder="Simple and clean editor..."
            />
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(minimalistContent)} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
              <Button onClick={() => downloadHtml(minimalistContent, 'minimalist-content.html')} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Markdown Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Markdown Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MarkdownEditor
              value={markdownContent}
              onChange={setMarkdownContent}
              placeholder="Write in Markdown..."
            />
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(markdownContent)} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Markdown
              </Button>
              <Button onClick={() => downloadHtml(markdownContent, 'markdown-content.md')} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Compact Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Compact Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CompactEditor
              value={compactContent}
              onChange={setCompactContent}
              placeholder="Compact editor for quick edits..."
            />
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(compactContent)} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
              <Button onClick={() => downloadHtml(compactContent, 'compact-content.html')} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Editor Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Editor Selector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WysiwygEditorSelector
              value={selectorContent}
              onChange={setSelectorContent}
              placeholder="Choose your editor type..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 