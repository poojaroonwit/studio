"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Link,
  Unlink,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  Type,
  Eraser,
  Undo,
  Redo,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== TIP TAP EDITOR (Modern, Extensible) =====
interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function TipTapEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  readOnly = false,
}: TipTapEditorProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const tiptapEditorRef = useRef<any>(null);
  const isSettingContent = useRef(false);

  // Initialize editor only once
  useEffect(() => {
    let Editor, StarterKit, Underline, Link, TextAlign, Color, TextStyle;

    const loadTipTap = async () => {
      Editor = (await import("@tiptap/react")).Editor;
      StarterKit = await import("@tiptap/starter-kit");
      Underline = await import("@tiptap/extension-underline");
      Link = await import("@tiptap/extension-link");
      TextAlign = await import("@tiptap/extension-text-align");
      Color = await import("@tiptap/extension-color");
      TextStyle = await import("@tiptap/extension-text-style");

      if (editorRef.current) {
        const instance = new Editor({
          element: editorRef.current,
          extensions: [
            StarterKit.default,
            Underline.default,
            Link.default.configure({ openOnClick: false }),
            TextAlign.default.configure({ types: ["heading", "paragraph"] }),
            Color.default,
            TextStyle.default,
          ],
          content: value || "",
          editable: !readOnly,
          onUpdate: ({ editor }) => {
            if (isSettingContent.current) return;
            onChange(editor.getHTML());
          },
          editorProps: {
            attributes: {
              class:
                "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
              placeholder: placeholder,
            },
          },
        });
        tiptapEditorRef.current = instance;
        setEditorInstance(instance);
        setIsLoaded(true);
      }
    };

    loadTipTap();

    return () => {
      if (tiptapEditorRef.current) {
        tiptapEditorRef.current.destroy();
        tiptapEditorRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  // Sync content from parent to editor
  useEffect(() => {
    const editor = tiptapEditorRef.current;
    if (editor && editor.getHTML() !== value) {
      isSettingContent.current = true;
      editor.commands.setContent(value || "", false);
      isSettingContent.current = false;
    }
  }, [value]);

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {!readOnly && editorInstance && (
        <TipTapToolbar editor={editorInstance} />
      )}
      <div
        ref={editorRef}
        className="min-h-[200px] p-4 bg-white"
      />
      {!isLoaded && (
        <div className="min-h-[200px] p-4 bg-muted/50 animate-pulse rounded-md" />
      )}
    </div>
  );
}

// Toolbar implementation
function TipTapToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  
  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        data-active={editor.isActive('underline')}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        data-active={editor.isActive('strike')}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        data-active={editor.isActive('heading', { level: 1 })}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        data-active={editor.isActive('heading', { level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        data-active={editor.isActive('heading', { level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-active={editor.isActive('bulletList')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive('orderedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        data-active={editor.isActive('blockquote')}
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        data-active={editor.isActive({ textAlign: 'left' })}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        data-active={editor.isActive({ textAlign: 'center' })}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        data-active={editor.isActive({ textAlign: 'right' })}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        data-active={editor.isActive({ textAlign: 'justify' })}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ===== MINIMALIST CUSTOM EDITOR =====
interface MinimalistEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function MinimalistEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing...", 
  className,
  readOnly = false 
}: MinimalistEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {!readOnly && (
        <div className="flex items-center justify-between p-2 border-b bg-muted/30">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => execCommand('bold')}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => execCommand('italic')}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => execCommand('underline')}
            >
              <Underline className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => execCommand('insertUnorderedList')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => execCommand('insertOrderedList')}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={insertLink}
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => execCommand('removeFormat')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>
      )}
      
      <div className="min-h-[200px] p-4">
        {isPreview ? (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            className="min-h-[200px] focus:outline-none prose prose-sm max-w-none"
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: value }}
          />
        )}
      </div>
    </div>
  );
}

// ===== MARKDOWN EDITOR =====
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "# Start writing in Markdown...", 
  className,
  readOnly = false 
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  const convertMarkdownToHtml = (markdown: string): string => {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Markdown Editor</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-3"
          onClick={() => setIsPreview(!isPreview)}
        >
          {isPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {isPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
      
      <div className="min-h-[200px]">
        {isPreview ? (
          <div 
            className="p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(value) }}
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className="w-full h-[200px] p-4 resize-none focus:outline-none font-mono text-sm"
          />
        )}
      </div>
    </div>
  );
}

// ===== EDITOR SELECTOR COMPONENT =====
interface WysiwygEditorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function WysiwygEditorSelector({ 
  value, 
  onChange, 
  placeholder,
  className,
  readOnly = false 
}: WysiwygEditorSelectorProps) {
  const [selectedEditor, setSelectedEditor] = useState<'tiptap' | 'minimalist' | 'markdown'>('tiptap');

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={selectedEditor} onValueChange={(value) => setSelectedEditor(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tiptap">TipTap (Modern)</TabsTrigger>
          <TabsTrigger value="minimalist">Minimalist</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tiptap" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">TipTap Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <TipTapEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="minimalist" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Minimalist Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <MinimalistEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="markdown" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Markdown Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== COMPACT EDITOR (Alternative to ReactQuill) =====
interface CompactEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function CompactEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing...", 
  className,
  readOnly = false 
}: CompactEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={cn("border rounded-xl overflow-hidden transition-all", className)}>
      {!readOnly && (
        <div className={cn(
          "border-b bg-muted/30 transition-all duration-200",
          showToolbar ? "p-2" : "p-1"
        )}>
          <div className={cn(
            "flex items-center gap-1 transition-all",
            showToolbar ? "opacity-100" : "opacity-0"
          )}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => execCommand('bold')}
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => execCommand('italic')}
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => execCommand('underline')}
            >
              <Underline className="h-3 w-3" />
            </Button>
            
            <Separator orientation="vertical" className="h-5" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => execCommand('insertUnorderedList')}
            >
              <List className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => execCommand('insertOrderedList')}
            >
              <ListOrdered className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
        onInput={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        onFocus={() => setShowToolbar(true)}
        onBlur={() => setShowToolbar(false)}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
} 