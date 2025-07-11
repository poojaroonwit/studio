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
import { 
  FileText, 
  Zap, 
  Palette, 
  Code, 
  Type, 
  Eye,
  Copy,
  Download
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

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">WYSIWYG Editor Designs</h1>
        <p className="text-xl text-muted-foreground">
          Explore different WYSIWYG editor designs for your application
        </p>
      </div>

      {/* Editor Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* TipTap Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <CardTitle>TipTap Editor</CardTitle>
                <Badge variant="secondary">Modern</Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(tiptapContent)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadHtml(tiptapContent, 'tiptap-content.html')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Modern, extensible editor with rich features and excellent TypeScript support
            </p>
          </CardHeader>
          <CardContent>
            <TipTapEditor
              value={tiptapContent}
              onChange={setTipTapContent}
              placeholder="Start writing with TipTap..."
            />
          </CardContent>
        </Card>

        {/* Minimalist Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-green-500" />
                <CardTitle>Minimalist Editor</CardTitle>
                <Badge variant="secondary">Simple</Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(minimalistContent)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadHtml(minimalistContent, 'minimalist-content.html')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Clean, lightweight editor with essential formatting options
            </p>
          </CardHeader>
          <CardContent>
            <MinimalistEditor
              value={minimalistContent}
              onChange={setMinimalistContent}
              placeholder="Start writing with minimalist editor..."
            />
          </CardContent>
        </Card>

        {/* Markdown Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-purple-500" />
                <CardTitle>Markdown Editor</CardTitle>
                <Badge variant="secondary">Markdown</Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(markdownContent)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadHtml(markdownContent, 'markdown-content.md')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Write in Markdown with live preview and syntax highlighting
            </p>
          </CardHeader>
          <CardContent>
            <MarkdownEditor
              value={markdownContent}
              onChange={setMarkdownContent}
              placeholder="# Start writing in Markdown..."
            />
          </CardContent>
        </Card>

        {/* Compact Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                <CardTitle>Compact Editor</CardTitle>
                <Badge variant="secondary">Compact</Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(compactContent)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => downloadHtml(compactContent, 'compact-content.html')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Space-efficient editor with collapsible toolbar
            </p>
          </CardHeader>
          <CardContent>
            <CompactEditor
              value={compactContent}
              onChange={setCompactContent}
              placeholder="Start writing with compact editor..."
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Editor Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-pink-500" />
            <CardTitle>Editor Selector</CardTitle>
            <Badge variant="secondary">Interactive</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Switch between different editor types dynamically
          </p>
        </CardHeader>
        <CardContent>
          <WysiwygEditorSelector
            value={selectorContent}
            onChange={setSelectorContent}
            placeholder="Choose your preferred editor type..."
          />
        </CardContent>
      </Card>

      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Features Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600">TipTap Editor</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ Modern architecture</li>
                <li>✅ TypeScript support</li>
                <li>✅ Extensible plugins</li>
                <li>✅ Collaborative editing</li>
                <li>✅ Custom extensions</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">Minimalist Editor</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ Lightweight</li>
                <li>✅ Simple setup</li>
                <li>✅ Essential features</li>
                <li>✅ Preview mode</li>
                <li>✅ Custom styling</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-600">Markdown Editor</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ Markdown syntax</li>
                <li>✅ Live preview</li>
                <li>✅ Clean output</li>
                <li>✅ Version control friendly</li>
                <li>✅ Developer friendly</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-600">Compact Editor</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ Space efficient</li>
                <li>✅ Collapsible toolbar</li>
                <li>✅ Focus on content</li>
                <li>✅ Quick formatting</li>
                <li>✅ Mobile friendly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Installation & Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">For TipTap Editor:</h3>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-text-align @tiptap/extension-color @tiptap/extension-text-style`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Usage Example:</h3>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { TipTapEditor } from '@/components/ui/wysiwyg-editors';

function MyComponent() {
  const [content, setContent] = useState('');
  
  return (
    <TipTapEditor
      value={content}
      onChange={setContent}
      placeholder="Start writing..."
    />
  );
}`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Replace ReactQuill:</h3>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`// Replace this:
import ReactQuill from 'react-quill';

// With this:
import { TipTapEditor } from '@/components/ui/wysiwyg-editors';`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 