"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EditorJSEditor } from '@/components/ui/editorjs-editor';
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
<h1>Welcome to Editor.js</h1>
<p>This is a block-based editor that outputs clean JSON data. Each block is independent and can be easily manipulated.</p>

<h2>Key Features</h2>
<ul>
<li>Block-based editing</li>
<li>Clean JSON output</li>
<li>Extensible with plugins</li>
<li>Modern UI/UX</li>
</ul>

<h2>Supported Blocks</h2>
<ol>
<li>Headers (H1, H2, H3)</li>
<li>Paragraphs</li>
<li>Lists (ordered and unordered)</li>
<li>Quotes</li>
<li>Code blocks</li>
<li>Tables</li>
<li>Images</li>
<li>Links</li>
<li>Checklists</li>
<li>And more...</li>
</ol>

<blockquote>Editor.js is designed to be developer-friendly with clean data output and a simple API.</blockquote>

<p><strong>Try it out:</strong> Use the toolbar to add different types of blocks and see how the editor handles them!</p>
`;

export default function EditorJSDemoPage() {
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
    // Convert HTML to Editor.js JSON format (simplified)
    const jsonData = {
      time: Date.now(),
      blocks: [
        {
          id: 'header-1',
          type: 'header',
          data: {
            text: 'Sample Editor.js Content',
            level: 1
          }
        },
        {
          id: 'paragraph-1',
          type: 'paragraph',
          data: {
            text: 'This is a sample JSON output from Editor.js'
          }
        }
      ],
      version: '2.28.2'
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'editorjs-content.json';
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
          <h2 className="text-2xl font-bold mb-2">Try Editor.js</h2>
          <p className="text-muted-foreground">Edit the content below and see Editor.js in action</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Editor.js Block-based Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditorJSEditor
              value={content}
              onChange={setContent}
              placeholder="Start typing or use the toolbar to add blocks..."
            />
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => copyToClipboard(content)} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
              <Button onClick={() => downloadHtml(content, 'editorjs-content.html')} size="sm">
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
            <a href="https://editorjs.io/" target="_blank" rel="noopener noreferrer">
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
    </div>
  );
} 