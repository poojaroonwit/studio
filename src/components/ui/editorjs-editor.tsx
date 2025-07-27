"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Type, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorJS } from '@/hooks/use-editorjs';
import './editorjs-theme.css';

// ===== TYPES =====
export interface EditorJSEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  isOpen?: boolean;
}

// ===== MAIN COMPONENT =====
export function EditorJSEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  readOnly = false,
  isOpen,
}: EditorJSEditorProps) {
  // ===== REFS =====
  const editorRef = useRef<HTMLDivElement>(null);
  
  // ===== CUSTOM HOOK =====
  const {
    isLoaded,
    editorInstance,
    editorId,
    isInitialized,
    initEditor,
    destroyEditor,
    focus,
    openToolbar,
    prevIsOpen,
  } = useEditorJS({
    value,
    onChange,
    readOnly,
    isOpen,
  });

  // ===== EFFECTS =====
  useEffect(() => {
    console.log('EditorJSEditor effect - isOpen:', isOpen, 'isInitialized:', isInitialized, 'value length:', value?.length);
    
    if (isOpen && !isInitialized) {
      // Initialize editor when modal opens
      if (editorRef.current) {
        // Clear any existing content
        editorRef.current.innerHTML = '';
        editorRef.current.id = editorId;
        
        // Wait for next tick to ensure DOM is ready
        setTimeout(() => {
          const holderElement = document.getElementById(editorId);
          if (holderElement && !isInitialized) {
            console.log('Starting editor initialization...');
            initEditor(holderElement, placeholder);
          }
        }, 0);
      }
    } else if (!isOpen && isInitialized) {
      // Destroy editor when modal closes
      console.log('Destroying editor...');
      destroyEditor();
    }
    prevIsOpen.current = isOpen;
    
    return () => {
      if (!isOpen) {
        destroyEditor();
      }
    };
  }, [isOpen, readOnly, placeholder, initEditor, destroyEditor, isInitialized, editorId, prevIsOpen]);

  // ===== FORCE SINGLE BLOCK EFFECT =====
  useEffect(() => {
    if (isOpen && isInitialized && editorRef.current) {
      const forceSingleBlock = () => {
        const blocks = editorRef.current?.querySelectorAll('.ce-block');
        if (blocks && blocks.length > 1) {
          blocks.forEach((block, index) => {
            if (index > 0) {
              // Hide all blocks except the first one
              (block as HTMLElement).style.display = 'none';
              (block as HTMLElement).style.visibility = 'hidden';
              (block as HTMLElement).style.opacity = '0';
              (block as HTMLElement).style.height = '0';
              (block as HTMLElement).style.overflow = 'hidden';
            } else {
              // Ensure first block is visible and has content
              (block as HTMLElement).style.display = 'block';
              (block as HTMLElement).style.visibility = 'visible';
              (block as HTMLElement).style.opacity = '1';
              (block as HTMLElement).style.height = 'auto';
              (block as HTMLElement).style.overflow = 'visible';
              
              // Ensure paragraph content is visible
              const paragraph = block.querySelector('.ce-paragraph');
              if (paragraph) {
                (paragraph as HTMLElement).style.display = 'block';
                (paragraph as HTMLElement).style.visibility = 'visible';
                (paragraph as HTMLElement).style.opacity = '1';
              }
              
              // Ensure block content is visible
              const blockContent = block.querySelector('.ce-block__content');
              if (blockContent) {
                (blockContent as HTMLElement).style.display = 'block';
                (blockContent as HTMLElement).style.visibility = 'visible';
                (blockContent as HTMLElement).style.opacity = '1';
              }
            }
          });
          console.log('Forced single block display and ensured content visibility');
        }
      };

      // Force single block after a short delay
      const timer = setTimeout(forceSingleBlock, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isInitialized, value]);

  // ===== RENDER =====
  return (
    <div className={cn(
      "border rounded-lg bg-background text-foreground overflow-hidden",
      className
    )}>
      
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 font-sans text-base text-foreground bg-background transition-colors">
        <div
          ref={editorRef}
          id={editorId}
          className="min-h-[200px] focus:outline-none"
        />
      </div>
      
      {!isLoaded && !readOnly && (
        <div className="min-h-[200px] p-4 bg-muted/50 rounded-md" />
      )}
    </div>
  );
} 