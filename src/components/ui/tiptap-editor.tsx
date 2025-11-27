"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';
import { TiptapToolbar } from './tiptap-toolbar';
import { sanitizeHtml } from '@/lib/security';

// ===== TYPES =====
export interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  isOpen?: boolean;
  showToolbar?: boolean;
  onExpand?: () => void;
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
  onExpand,
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
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = sanitizeHtml(html);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedHtml;

    // Remove any script tags for security (additional safety measure)
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
        // Use default configuration for most extensions
      }),
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
        placeholder: placeholder,
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
      {showToolbar && !readOnly && <TiptapToolbar editor={editor} onExpand={onExpand} />}
      
      <div className={cn(
        "p-6 font-sans text-base text-foreground bg-background transition-colors overflow-y-auto",
        className?.includes('fullscreen') 
          ? "min-h-[60vh] max-h-[60vh]" 
          : className?.includes('h-full') || className?.includes('flex-1')
            ? "min-h-[200px] h-full" 
            : "min-h-[200px] max-h-[400px]"
      )}>
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