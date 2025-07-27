import { useCallback, useRef, useState } from 'react';

interface EditorJSInstance {
  destroy?: () => void;
  save?: () => Promise<any>;
  focus?: () => void;
  render?: (data: any) => Promise<void>;
  toolbar?: {
    open?: () => void;
  };
}

interface UseEditorJSOptions {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  isOpen?: boolean;
}

export function useEditorJS({
  value,
  onChange,
  readOnly = false,
  isOpen,
}: UseEditorJSOptions) {
  // ===== STATE =====
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorInstance, setEditorInstance] = useState<EditorJSInstance | null>(null);
  
  // ===== REFS =====
  const editorJSRef = useRef<EditorJSInstance | null>(null);
  const prevIsOpen = useRef<boolean | undefined>(undefined);
  const isInitialized = useRef<boolean>(false);
  const editorId = useRef<string>(`editorjs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const onChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValue = useRef<string>('');

  // ===== UTILITY FUNCTIONS =====
  const destroyEditor = useCallback(() => {
    // Clear any pending onChange timeout
    if (onChangeTimeoutRef.current) {
      clearTimeout(onChangeTimeoutRef.current);
      onChangeTimeoutRef.current = null;
    }
    
    if (editorJSRef.current?.destroy) {
      try {
        editorJSRef.current.destroy();
      } catch (error) {
        console.error('Error destroying Editor.js instance:', error);
      }
    }
    
    editorJSRef.current = null;
    setEditorInstance(null);
    setIsLoaded(false);
    isInitialized.current = false;
    lastSavedValue.current = '';
  }, []);

  const initEditor = useCallback(async (holderElement: HTMLElement, placeholder: string = "Start writing...") => {
    if (readOnly || isInitialized.current) {
      console.log('Editor already initialized or readOnly, skipping...');
      return;
    }
    
    console.log('Initializing editor with value:', value?.substring(0, 100) + '...');
    
    try {
      // Set loading state immediately
      setIsLoaded(false);
      
      // Clear holder completely
      holderElement.innerHTML = '';
      
      // Create editor instance immediately without waiting for imports
      const EditorJS = (await import('@editorjs/editorjs')).default;
      
      // Create editor with NO initial data to prevent duplicate blocks
      const editor = new EditorJS({
        holder: holderElement,
        placeholder,
        readOnly,
        data: { time: Date.now(), blocks: [], version: '2.28.2' },
        tools: {
          paragraph: {
            class: (await import('@editorjs/paragraph')).default as any,
            inlineToolbar: true,
            config: {
              placeholder: 'Start writing...'
            }
          },
          header: {
            class: (await import('@editorjs/header')).default as any,
            inlineToolbar: true,
            config: {
              placeholder: 'Enter a header',
              levels: [1, 2, 3],
              defaultLevel: 1
            }
          },
          list: {
            class: (await import('@editorjs/list')).default as any,
            inlineToolbar: true,
            config: {
              defaultStyle: 'unordered'
            }
          },
          quote: {
            class: (await import('@editorjs/quote')).default as any,
            inlineToolbar: true,
            config: {
              quotePlaceholder: 'Enter a quote',
              captionPlaceholder: 'Quote\'s author'
            }
          },
          delimiter: (await import('@editorjs/delimiter')).default as any,
          code: (await import('@editorjs/code')).default as any,
          linkTool: {
            // @ts-ignore
            class: (await import('@editorjs/link')).default as any,
            config: {
              endpoint: '/api/link-preview'
            }
          },
          checklist: {
            // @ts-ignore
            class: (await import('@editorjs/checklist')).default as any,
            inlineToolbar: true
          },
          marker: {
            // @ts-ignore
            class: (await import('@editorjs/marker')).default as any,
            shortcut: 'CMD+SHIFT+M'
          },
          table: {
            class: (await import('@editorjs/table')).default as any,
            inlineToolbar: true,
            config: {
              rows: 2,
              cols: 3
            }
          },
          embed: {
            class: (await import('@editorjs/embed')).default as any,
            config: {
              services: {
                youtube: true,
                coub: true,
                vimeo: true
              }
            }
          }
        },
        onChange: async () => {
          if (editor && !readOnly && editor.save) {
            try {
              // Clear any existing timeout
              if (onChangeTimeoutRef.current) {
                clearTimeout(onChangeTimeoutRef.current);
              }
              
              // Debounce the onChange to prevent rapid calls during scrolling
              onChangeTimeoutRef.current = setTimeout(async () => {
                const outputData = await editor.save();
                const html = convertEditorJSDataToHtml(outputData as any);
                
                // Only call onChange if the value has actually changed
                if (html !== lastSavedValue.current) {
                  lastSavedValue.current = html;
                  onChange(html);
                }
              }, 300); // 300ms debounce
            } catch (error) {
              console.error('Error saving editor data:', error);
            }
          }
        }
      });

      editorJSRef.current = editor;
      setEditorInstance(editor);
      setIsLoaded(true);
      isInitialized.current = true;
      lastSavedValue.current = value || '';
      
      // Set content after editor is ready to avoid duplicate blocks
      if (value?.trim()) {
        setTimeout(async () => {
          try {
            if (editor && editor.render) {
              // Create a single paragraph block with the content
              const data = {
                time: Date.now(),
                blocks: [
                  {
                    id: `paragraph-${Date.now()}`,
                    type: 'paragraph',
                    data: { text: value.trim() }
                  }
                ],
                version: '2.28.2'
              };
              
              console.log('Setting content with single block:', data);
              await editor.render(data);
            }
          } catch (error) {
            console.error('Error setting content:', error);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error initializing Editor.js:', error);
    }
  }, [value, readOnly, onChange]);

  // ===== PUBLIC METHODS =====
  const focus = useCallback(() => {
    if (editorInstance?.focus) {
      editorInstance.focus();
    }
  }, [editorInstance]);

  const openToolbar = useCallback(() => {
    if (editorInstance?.toolbar?.open) {
      editorInstance.toolbar.open();
    }
  }, [editorInstance]);

  return {
    // State
    isLoaded,
    editorInstance,
    editorId: editorId.current,
    isInitialized: isInitialized.current,
    
    // Methods
    initEditor,
    destroyEditor,
    focus,
    openToolbar,
    
    // Refs for internal use
    prevIsOpen,
    lastSavedValue,
  };
}

// ===== UTILITY FUNCTIONS =====
const convertEditorJSDataToHtml = (data: any): string => {
  if (!data?.blocks) return '';
  
  return data.blocks.map((block: any) => {
    switch (block.type) {
      case 'header':
        return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
      case 'list':
        const listType = block.data.style === 'ordered' ? 'ol' : 'ul';
        const items = block.data.items.map((item: string) => `<li>${item}</li>`).join('');
        return `<${listType}>${items}</${listType}>`;
      case 'quote':
        return `<blockquote><p>${block.data.text}</p><cite>${block.data.caption || ''}</cite></blockquote>`;
      case 'delimiter':
        return '<hr>';
      case 'code':
        return `<pre><code>${block.data.code}</code></pre>`;
      case 'linkTool':
        return `<div class="link-tool"><a href="${block.data.link}" target="_blank" rel="noopener noreferrer">${block.data.meta?.title || block.data.link}</a></div>`;
      case 'checklist':
        const checklistItems = block.data.items.map((item: any) => 
          `<li style="list-style: none;"><input type="checkbox" ${item.checked ? 'checked' : ''} disabled /> ${item.text}</li>`
        ).join('');
        return `<ul style="list-style: none; padding-left: 0;">${checklistItems}</ul>`;
      case 'table':
        const rows = block.data.content || [];
        const tableRows = rows.map((row: string[]) => 
          `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
        ).join('');
        return `<table border="1" style="border-collapse: collapse; width: 100%;"><tbody>${tableRows}</tbody></table>`;
      case 'embed':
        return `<div class="embed-tool"><iframe src="${block.data.embed}" width="100%" height="400" frameborder="0" allowfullscreen></iframe></div>`;
      case 'paragraph':
      default:
        return `<p>${block.data.text || ''}</p>`;
    }
  }).join('');
};

const convertHtmlToEditorJSData = (html: string) => {
  if (!html?.trim()) {
    return { time: Date.now(), blocks: [], version: '2.28.2' };
  }

  // Extract text content from HTML - take only the first meaningful content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get all text content and take only the first non-empty line
  const allText = tempDiv.textContent || '';
  const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textContent = lines[0] || html.trim();

  console.log('Converting HTML to EditorJS data:', { html, textContent, allLines: lines });

  // Always create only ONE paragraph block to avoid duplicates
  const result = {
    time: Date.now(),
    blocks: [
      {
        id: `paragraph-${Date.now()}`,
        type: 'paragraph',
        data: { text: textContent }
      }
    ],
    version: '2.28.2'
  };

  console.log('Converted data:', result);
  return result;
}; 