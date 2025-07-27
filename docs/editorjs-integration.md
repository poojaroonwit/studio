# Editor.js Integration

This document explains how to use Editor.js in the Studio-7 project.

## Overview

Editor.js is the primary and only WYSIWYG editor used in the Studio-7 project. It's a block-based editor that outputs clean JSON data instead of messy HTML, designed to be developer-friendly and extensible.

## Features

- **Block-based Editing**: Each piece of content is a separate, manageable block
- **Clean JSON Output**: Structured data perfect for APIs and databases
- **Extensible**: Easy to add custom blocks and tools
- **Modern UI**: Beautiful, intuitive interface
- **Multiple Block Types**: Headers, paragraphs, lists, quotes, code, tables, images, etc.

## Installation

Editor.js and its essential plugins are already installed:

```bash
npm install @editorjs/editorjs @editorjs/header @editorjs/list @editorjs/quote @editorjs/marker @editorjs/checklist @editorjs/delimiter @editorjs/table @editorjs/link @editorjs/image @editorjs/embed @editorjs/code @editorjs/paragraph @editorjs/warning @editorjs/raw
```

## Usage

### Basic Usage

```tsx
import { EditorJSEditor } from '@/components/ui/editorjs-editor';

function MyComponent() {
  const [content, setContent] = useState('');

  return (
    <EditorJSEditor
      value={content}
      onChange={setContent}
      placeholder="Start writing..."
    />
  );
}
```

### Direct Usage

```tsx
import { EditorJSEditor } from '@/components/ui/wysiwyg-editors';

function MyComponent() {
  const [content, setContent] = useState('');

  return (
    <EditorJSEditor
      value={content}
      onChange={setContent}
      placeholder="Start writing..."
    />
  );
}
```

## Available Block Types

### Text Blocks
- **Header**: H1, H2, H3 headings
- **Paragraph**: Regular text blocks
- **Quote**: Blockquotes with optional captions
- **Code**: Code blocks with syntax highlighting

### List Blocks
- **List**: Ordered and unordered lists
- **Checklist**: Checkable list items

### Media Blocks
- **Image**: Upload or link images
- **Embed**: Embed videos, tweets, etc.
- **Link**: Rich link previews

### Layout Blocks
- **Table**: Data tables
- **Delimiter**: Visual separators
- **Warning**: Highlighted warning boxes
- **Raw**: Custom HTML content

## API Endpoints

The following API endpoints are available for Editor.js features:

### Image Upload
- **Endpoint**: `/api/upload-image`
- **Method**: POST
- **Purpose**: Handle image uploads for the image block

### Link Preview
- **Endpoint**: `/api/link-preview`
- **Method**: POST
- **Purpose**: Generate link previews for the link tool

### Fetch Image
- **Endpoint**: `/api/fetch-image`
- **Method**: POST
- **Purpose**: Fetch images by URL

## Data Format

Editor.js outputs structured JSON data:

```json
{
  "time": 1738927231079,
  "blocks": [
    {
      "id": "mhTl6ghSkV",
      "type": "paragraph",
      "data": {
        "text": "This is a paragraph block"
      }
    },
    {
      "id": "l98dyx3yjb",
      "type": "header",
      "data": {
        "text": "This is a header",
        "level": 2
      }
    }
  ],
  "version": "2.28.2"
}
```

## Conversion

The Editor.js component automatically converts between HTML and JSON formats:

- **HTML to JSON**: When loading existing content
- **JSON to HTML**: When saving content for display

## Customization

### Adding Custom Blocks

1. Install the block plugin:
```bash
npm install @editorjs/your-custom-block
```

2. Import and configure in the editor:
```tsx
const CustomBlock = dynamic(() => import('@editorjs/your-custom-block'), { ssr: false });

// In the tools configuration:
tools: {
  customBlock: {
    class: CustomBlock,
    config: {
      // Your configuration
    }
  }
}
```

### Styling

Editor.js styles are defined in `src/app/globals.css`. You can customize:

- Block appearance
- Toolbar styling
- Inline toolbar
- Toolbox appearance
- Responsive behavior

## Demo Pages

- **Editor.js Demo**: `/wysiwyg-demo` - Editor.js showcase
- **Editor.js Demo**: `/editorjs-demo` - Dedicated Editor.js showcase

## Troubleshooting

### Common Issues

1. **Naming Conflicts**: Editor.js tool imports are prefixed with "Tool" to avoid conflicts with Lucide React icons.

2. **SSR Issues**: All Editor.js imports use dynamic imports with `{ ssr: false }` to prevent server-side rendering issues.

3. **Image Upload**: Ensure the `/public/uploads` directory exists and is writable.

### Performance

- Editor.js is loaded dynamically to reduce initial bundle size
- Images are optimized and stored in the public directory
- JSON data is lightweight and efficient

## Resources

- [Official Documentation](https://editorjs.io/)
- [GitHub Repository](https://github.com/codex-team/editor.js)
- [Available Plugins](https://github.com/editor-js/awesome-editorjs)

## Migration from Other Editors

If you're migrating from other editors:

1. The component automatically converts HTML to Editor.js format
2. Existing content will be preserved
3. The API remains consistent with the project standards
4. All content is now managed through Editor.js

## Best Practices

1. **Content Validation**: Always validate Editor.js JSON data before processing
2. **Error Handling**: Handle cases where Editor.js fails to load
3. **Accessibility**: Ensure custom blocks are accessible
4. **Performance**: Use lazy loading for large documents
5. **Backup**: Always backup content before major updates 