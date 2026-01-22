"use client";

import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Minus,
  Maximize2,
} from 'lucide-react';

interface TiptapToolbarProps {
  editor: Editor | null;
  onExpand?: () => void;
}

export function TiptapToolbar({ editor, onExpand }: TiptapToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted p-2 flex flex-wrap gap-1">
      {/* Text Formatting */}
      <Button
        type="button"
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className="h-7 w-7 p-0"
      >
        <Bold className="h-3 w-3" />
      </Button>
      
      <Button
        type="button"
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className="h-7 w-7 p-0"
      >
        <Italic className="h-3 w-3" />
      </Button>
      

      
      <Button
        type="button"
        variant={editor.isActive('strike') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className="h-7 w-7 p-0"
      >
        <Strikethrough className="h-3 w-3" />
      </Button>
      
      <Button
        type="button"
        variant={editor.isActive('code') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className="h-7 w-7 p-0"
      >
        <Code className="h-3 w-3" />
      </Button>

      <Separator orientation="vertical" className="h-5" />

      {/* Lists */}
      <Button
        type="button"
        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-7 w-7 p-0"
      >
        <List className="h-3 w-3" />
      </Button>
      
      <Button
        type="button"
        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-7 w-7 p-0"
      >
        <ListOrdered className="h-3 w-3" />
      </Button>

      <Separator orientation="vertical" className="h-5" />

      {/* Block Elements */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="h-7 w-7 p-0"
      >
        <Minus className="h-3 w-3" />
      </Button>
      
      <Separator orientation="vertical" className="h-5" />



      {/* Expand Button */}
      {onExpand && (
        <>
          <Separator orientation="vertical" className="h-5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExpand}
            className="h-7 w-7 p-0"
            title="Expand to Fullscreen"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
} 