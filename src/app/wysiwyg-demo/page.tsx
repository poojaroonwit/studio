"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { FileText, Code, Palette, Zap } from 'lucide-react';

export default function WYSIWYGDemoPage() {
  const [content1, setContent1] = useState('<p>This is a basic example of the Editor.js WYSIWYG editor.</p>');
  const [content2, setContent2] = useState('<h2>Rich Content Example</h2><p>This editor supports:</p><ul><li>Headers (H1, H2, H3)</li><li>Lists (ordered and unordered)</li><li>Quotes with captions</li><li>Code blocks</li><li>Delimiters</li></ul><blockquote><p>This is a quote block with a caption.</p><cite>Author Name</cite></blockquote>');
  const [content3, setContent3] = useState('');

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">WYSIWYG Editor Demo</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience the power of Editor.js - a block-style editor with clean JSON output and extensible plugins.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Fast & Lightweight
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Code className="h-3 w-3" />
            JSON Output
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Customizable
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Basic Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Editor Example
          </CardTitle>
          <CardDescription>
            A simple editor with basic content. Try editing the text below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TiptapEditor
            value={content1}
            onChange={setContent1}
            placeholder="Start typing your content..."
            className="min-h-[200px]"
          />
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">HTML Output:</h4>
            <pre className="text-sm overflow-x-auto">{content1}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Rich Content Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Rich Content Example
          </CardTitle>
          <CardDescription>
            This editor is pre-populated with various content types to showcase the editor's capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TiptapEditor
            value={content2}
            onChange={setContent2}
            placeholder="Add headers, lists, quotes, and more..."
            className="min-h-[300px]"
          />
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">HTML Output:</h4>
            <pre className="text-sm overflow-x-auto max-h-40 overflow-y-auto">{content2}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Empty Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Empty Editor
          </CardTitle>
          <CardDescription>
            Start from scratch and explore all the available tools and features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TiptapEditor
            value={content3}
            onChange={setContent3}
            placeholder="Click the + button to add new blocks, or start typing..."
            className="min-h-[250px]"
          />
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">HTML Output:</h4>
            <pre className="text-sm overflow-x-auto">{content3 || '<p>No content yet...</p>'}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features & Capabilities</CardTitle>
          <CardDescription>
            What makes this WYSIWYG editor special
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Content Types</h3>
              <ul className="space-y-2 text-sm">
                <li>• Headers (H1, H2, H3)</li>
                <li>• Paragraphs with rich text</li>
                <li>• Ordered and unordered lists</li>
                <li>• Quote blocks with captions</li>
                <li>• Code blocks with syntax highlighting</li>
                <li>• Delimiters (horizontal rules)</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Technical Features</h3>
              <ul className="space-y-2 text-sm">
                <li>• Clean JSON output format</li>
                <li>• Debounced change detection</li>
                <li>• Dark mode support</li>
                <li>• Responsive design</li>
                <li>• Accessibility compliant</li>
                <li>• TypeScript support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
          <CardDescription>
            Quick guide to using the Editor.js WYSIWYG editor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Adding Content:</h4>
              <ul className="text-sm space-y-1">
                <li>• Click the <code className="bg-muted px-1 rounded">+</code> button to add new blocks</li>
                <li>• Use <code className="bg-muted px-1 rounded">Tab</code> to indent list items</li>
                <li>• Press <code className="bg-muted px-1 rounded">Enter</code> to create new blocks</li>
                <li>• Use <code className="bg-muted px-1 rounded">Backspace</code> to delete empty blocks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Text Formatting:</h4>
              <ul className="text-sm space-y-1">
                <li>• Select text to see the inline toolbar</li>
                <li>• Use <code className="bg-muted px-1 rounded">**bold**</code> for bold text</li>
                <li>• Use <code className="bg-muted px-1 rounded">*italic*</code> for italic text</li>
                <li>• Use <code className="bg-muted px-1 rounded">`code`</code> for inline code</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 