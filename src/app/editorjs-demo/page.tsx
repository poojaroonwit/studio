"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Code, 
  Palette, 
  Type, 
  Eye,
  Copy,
  Download,
  Blocks,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const sampleContent = `
<h1>Welcome to Tiptap</h1>
<p>This is a modern, extensible rich text editor built with <strong>ProseMirror</strong>. It provides a better editing experience with improved HTML handling.</p>

<h2>Key Features</h2>
<ul>
<li>Modern block-based editing</li>
<li>Better HTML input/output</li>
<li>Extensible with plugins</li>
<li>Improved table support</li>
<li>Task lists and checkboxes</li>
<li>Text alignment options</li>
<li>Typography improvements</li>
</ul>

<h2>Supported Elements</h2>
<ol>
<li>Headers (H1, H2, H3)</li>
<li>Paragraphs with formatting</li>
<li>Lists (ordered, unordered, and task lists)</li>
<li>Blockquotes</li>
<li>Code blocks</li>
<li>Tables with resizable columns</li>
<li>Images and links</li>
<li>Horizontal rules</li>
<li>Text alignment</li>
<li>And much more...</li>
</ol>

<blockquote>Tiptap is designed to be developer-friendly with clean HTML output and a simple, extensible API.</blockquote>

<p><strong>Try it out:</strong> Use the toolbar above to add different types of content and see how the editor handles them!</p>
`;

export default function TiptapDemoPage() {
  const [content, setContent] = useState(sampleContent);
  const [showJson, setShowJson] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  const downloadJson = () => {
    // Convert HTML to JSON format (simplified)
    const jsonData = {
      time: Date.now(),
      content: content,
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tiptap-content.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON file downloaded!');
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Blocks className="h-8 w-8 text-blue-600" />
          <h1 className="text-4xl font-bold">Editor.js Demo</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience the power of block-based editing with Editor.js. 
          Clean JSON output, modern UI, and extensible architecture.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">Block-based</Badge>
          <Badge variant="secondary">JSON Output</Badge>
          <Badge variant="secondary">Extensible</Badge>
          <Badge variant="secondary">Modern UI</Badge>
        </div>
      </div>

      <Separator />

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Blocks className="h-5 w-5 text-blue-600" />
              Block-based Editing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Each piece of content is a separate block that can be easily moved, deleted, or modified.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-green-600" />
              Clean JSON Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Outputs structured JSON data instead of messy HTML, making it perfect for APIs and databases.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Extensible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Easy to extend with custom blocks and tools. Large ecosystem of plugins available.
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Editor Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Try Tiptap</h2>
          <p className="text-muted-foreground">Edit the content below and see Tiptap in action</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tiptap Rich Text Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TiptapEditor
              value={content}
              onChange={setContent}
              placeholder="Start typing or use the toolbar to add content..."
            />
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => copyToClipboard(content)} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
              <Button onClick={() => downloadHtml(content, 'tiptap-content.html')} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
              <Button onClick={downloadJson} size="sm" variant="outline">
                <Code className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button 
                onClick={() => setShowJson(!showJson)} 
                size="sm" 
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showJson ? 'Hide' : 'Show'} JSON
              </Button>
            </div>

            {showJson && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">JSON Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
                    {JSON.stringify({
                      time: Date.now(),
                      blocks: [
                        {
                          id: 'header-1',
                          type: 'header',
                          data: {
                            text: 'Sample JSON Structure',
                            level: 1
                          }
                        },
                        {
                          id: 'paragraph-1',
                          type: 'paragraph',
                          data: {
                            text: 'This is how Editor.js structures its data output.'
                          }
                        }
                      ],
                      version: '2.28.2'
                    }, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Documentation Links */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Learn More</h2>
        <div className="flex items-center justify-center gap-4">
          <Button asChild variant="outline">
            <a href="https://tiptap.dev/" target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-2" />
              Official Documentation
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="https://github.com/codex-team/editor.js" target="_blank" rel="noopener noreferrer">
              <Code className="h-4 w-4 mr-2" />
              GitHub Repository
            </a>
          </Button>
        </div>
      </div>
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>
          Learn more about{' '}
          <a href="https://tiptap.dev/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Tiptap
          </a>
          {' '}and its features.
        </p>
      </div>
    </div>
  );
} 