import { useCallback, useRef, useState, useEffect } from 'react';

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
      return;
    }
    
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
              // Convert HTML to Editor.js data format for proper block structure
              const data = convertHtmlToEditorJSData(value);
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

  // ===== VALUE UPDATE EFFECT =====
  useEffect(() => {
    if (isInitialized.current && editorJSRef.current && value !== lastSavedValue.current) {
      // Only update if the value has actually changed and is different from what we last saved
      const updateEditorContent = async () => {
        try {
          if (editorJSRef.current && editorJSRef.current.render) {
            // Convert HTML to Editor.js data format
            const data = convertHtmlToEditorJSData(value);
            await editorJSRef.current.render(data);
            lastSavedValue.current = value;
          }
        } catch (error) {
          console.error('Error updating editor content:', error);
        }
      };
      
      updateEditorContent();
    }
  }, [value]);

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

  console.log('Converting HTML to EditorJS data:', html.substring(0, 200) + '...');
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const blocks: any[] = [];
  let blockId = 0;

  // Recursively process all nodes
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push({
          id: `paragraph-${blockId++}`,
          type: 'paragraph',
          data: { text }
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      console.log('Processing element:', tagName, element.textContent?.substring(0, 50) + '...');

      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          const level = parseInt(tagName.charAt(1));
          const headerText = element.textContent?.trim();
          if (headerText) {
            blocks.push({
              id: `header-${blockId++}`,
              type: 'header',
              data: { text: headerText, level }
            });
          }
          break;
        }
        case 'p': {
          const paragraphText = element.textContent?.trim();
          if (paragraphText) {
            blocks.push({
              id: `paragraph-${blockId++}`,
              type: 'paragraph',
              data: { text: paragraphText }
            });
          }
          break;
        }
        case 'ul':
        case 'ol': {
          const listItems: string[] = [];
          element.querySelectorAll('li').forEach(li => {
            const itemText = li.textContent?.trim();
            if (itemText) listItems.push(itemText);
          });
          if (listItems.length > 0) {
            blocks.push({
              id: `list-${blockId++}`,
              type: 'list',
              data: {
                style: tagName === 'ol' ? 'ordered' : 'unordered',
                items: listItems
              }
            });
          }
          break;
        }
        case 'blockquote': {
          const quoteText = element.textContent?.trim();
          if (quoteText) {
            blocks.push({
              id: `quote-${blockId++}`,
              type: 'quote',
              data: { text: quoteText, caption: '' }
            });
          }
          break;
        }
        case 'table': {
          const rows: string[][] = [];
          console.log('Processing table element:', element);
          
          // Handle both thead and tbody, or just tr elements directly
          const tableRows = element.querySelectorAll('tr');
          console.log('Found table rows:', tableRows.length);
          
          tableRows.forEach((row, rowIndex) => {
            const cells: string[] = [];
            const tableCells = row.querySelectorAll('td, th');
            console.log(`Row ${rowIndex} has ${tableCells.length} cells`);
            
            tableCells.forEach((cell, cellIndex) => {
              const cellText = cell.textContent?.trim() || '';
              cells.push(cellText);
              console.log(`Cell ${cellIndex}: "${cellText}"`);
            });
            
            if (cells.length > 0) {
              rows.push(cells);
            }
          });
          
          console.log('Processed table rows:', rows);
          
          if (rows.length > 0) {
            blocks.push({
              id: `table-${blockId++}`,
              type: 'table',
              data: { content: rows }
            });
            console.log('Added table block with content:', rows);
          } else {
            console.warn('No valid rows found in table');
          }
          break;
        }
        case 'hr': {
          blocks.push({
            id: `delimiter-${blockId++}`,
            type: 'delimiter',
            data: {}
          });
          break;
        }
        default:
          // Recursively process all children
          Array.from(element.childNodes).forEach(processNode);
          break;
      }
    }
  };

  // Process all child nodes of the root
  Array.from(tempDiv.childNodes).forEach(processNode);

  // Fallback: if no blocks, add all text as a paragraph
  if (blocks.length === 0) {
    const textContent = tempDiv.textContent?.trim();
    if (textContent) {
      blocks.push({
        id: `paragraph-${blockId++}`,
        type: 'paragraph',
        data: { text: textContent }
      });
    }
  }

  console.log('Final EditorJS data blocks:', blocks);
  return {
    time: Date.now(),
    blocks,
    version: '2.28.2'
  };
}; 