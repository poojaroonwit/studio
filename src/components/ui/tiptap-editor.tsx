"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { cn } from '@/lib/utils';
import { TiptapToolbar } from './tiptap-toolbar';

// ===== TYPES =====
export interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  isOpen?: boolean;
  showToolbar?: boolean;
}

// ===== MAIN COMPONENT =====
export function TiptapEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  readOnly = false,
  isOpen,
  showToolbar = true,
}: TiptapEditorProps) {
  // ===== REFS =====
  const lastValueRef = useRef<string>('');
  const isUpdatingRef = useRef<boolean>(false);

  // ===== UTILITY FUNCTIONS =====
  const convertHtmlToTiptapContent = useCallback((html: string) => {
    if (!html?.trim()) {
      return '';
    }

    // Tiptap can handle HTML directly, but we need to clean it up
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove any script tags for security
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Clean up the HTML
    const cleanHtml = tempDiv.innerHTML
      .replace(/<p><\/p>/g, '') // Remove empty paragraphs
      .replace(/<br\s*\/?>/g, '') // Remove line breaks
      .trim();

    return cleanHtml || '<p></p>';
  }, []);

  // ===== TIPTAP EDITOR =====
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable some default extensions that we'll configure separately
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-300',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 font-bold border border-gray-300 px-2 py-1',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-2 py-1',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 p-2 rounded font-mono text-sm',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 italic',
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-inside',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-inside',
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: 'mb-1',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'border-t border-gray-300 my-4',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: convertHtmlToTiptapContent(value),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      
      const html = editor.getHTML();
      if (html !== lastValueRef.current) {
        lastValueRef.current = html;
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // ===== EFFECTS =====
  useEffect(() => {
    if (editor && value !== lastValueRef.current) {
      isUpdatingRef.current = true;
      const content = convertHtmlToTiptapContent(value);
      editor.commands.setContent(content, false);
      lastValueRef.current = value;
      isUpdatingRef.current = false;
    }
  }, [editor, value, convertHtmlToTiptapContent]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // ===== RENDER =====
  return (
    <div className={cn(
      "border rounded-lg bg-background text-foreground overflow-hidden",
      className
    )}>
      {showToolbar && !readOnly && <TiptapToolbar editor={editor} />}
      
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto font-sans text-base text-foreground bg-background transition-colors">
        <EditorContent 
          editor={editor} 
          className="focus:outline-none"
        />
      </div>
      
      {!editor && !readOnly && (
        <div className="min-h-[200px] p-4 bg-muted/50 rounded-md" />
      )}
    </div>
  );
} 