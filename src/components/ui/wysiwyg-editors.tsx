"use client";

// Export the Tiptap editor as the primary editor
export { TiptapEditor } from './tiptap-editor';
export { TiptapEditorWithExpand } from './tiptap-editor-with-expand';
export { TiptapFullscreenModal } from './tiptap-fullscreen-modal';

// Export types for better type safety
export type { TiptapEditorProps } from './tiptap-editor';

// Default export is TiptapEditorWithExpand (with expand functionality)
export { TiptapEditorWithExpand as default } from './tiptap-editor-with-expand';