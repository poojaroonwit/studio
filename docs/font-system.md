# Font System Documentation

## Overview

The application now supports automatic font switching between **Inter** (for English text) and **Anuphan** (for Thai text) to provide optimal readability for both languages.

## Fonts Used

### Inter Font (English)
- **Purpose**: Primary font for English text
- **Characteristics**: Modern, highly legible, optimized for computer screens
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Best for**: User interfaces, digital content, English text

### Anuphan Font (Thai)
- **Purpose**: Primary font for Thai text
- **Characteristics**: Modern, readable Thai font designed for digital screens
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Best for**: Thai text, mixed language content

## Implementation

### 1. Font Detection

The system automatically detects Thai text using Unicode range detection:

```typescript
// Thai Unicode range: \u0E00-\u0E7F
const thaiRegex = /[\u0E00-\u0E7F]/;
const isThai = thaiRegex.test(text);
```

### 2. CSS Classes

#### Direct Font Classes
```css
.font-inter     /* Force Inter font */
.font-anuphan   /* Force Anuphan font */
.font-auto      /* Automatic font selection */
```

#### Language-Specific Classes
```css
.english-text   /* English text styling */
.thai-text      /* Thai text styling */
```

### 3. Utility Functions

#### `containsThaiText(text: string): boolean`
Detects if text contains Thai characters.

```typescript
import { containsThaiText } from '@/lib/utils';

const hasThai = containsThaiText("Hello สวัสดี"); // true
```

#### `getFontClass(text: string): string`
Returns appropriate Tailwind font class.

```typescript
import { getFontClass } from '@/lib/utils';

const fontClass = getFontClass("Hello สวัสดี"); // "font-anuphan"
```

#### `getFontFamily(text: string): string`
Returns CSS font-family value.

```typescript
import { getFontFamily } from '@/lib/utils';

const fontFamily = getFontFamily("Hello สวัสดี");
// "var(--font-anuphan), var(--font-inter), Arial, Helvetica, sans-serif"
```

### 4. React Components

#### AutoFont Component
Automatically applies the correct font based on text content.

```tsx
import { AutoFont } from '@/components/ui/auto-font';

<AutoFont>Hello สวัสดี</AutoFont>
```

#### withAutoFont HOC
Higher-order component for automatic font application.

```tsx
import { withAutoFont } from '@/components/ui/auto-font';

const AutoFontButton = withAutoFont(Button);
<AutoFontButton>Hello สวัสดี</AutoFontButton>
```

#### useAutoFont Hook
React hook for dynamic font application.

```tsx
import { useAutoFont } from '@/components/ui/auto-font';

function MyComponent({ text }) {
  const { fontClass, lang, isThai } = useAutoFont(text);
  
  return (
    <div className={fontClass} lang={lang}>
      {text}
    </div>
  );
}
```

## Usage Examples

### 1. Basic Text Display
```tsx
// Automatic font selection
<AutoFont>Welcome to our system ยินดีต้อนรับสู่ระบบของเรา</AutoFont>

// Manual font selection
<div className="font-inter">English only text</div>
<div className="font-anuphan">ข้อความภาษาไทยเท่านั้น</div>
```

### 2. Form Inputs
```tsx
// Input with automatic font
<Input 
  className="font-auto"
  placeholder="Enter text here..."
/>

// Textarea with automatic font
<Textarea 
  className="font-auto"
  placeholder="Enter multi-line text..."
/>
```

### 3. Dynamic Content
```tsx
function DynamicText({ content }) {
  const { fontClass, lang } = useAutoFont(content);
  
  return (
    <div className={fontClass} lang={lang}>
      {content}
    </div>
  );
}
```

### 4. Conditional Styling
```tsx
function ConditionalText({ text }) {
  const isThai = containsThaiText(text);
  
  return (
    <div className={isThai ? 'font-anuphan' : 'font-inter'}>
      {text}
    </div>
  );
}
```

## CSS Variables

The fonts are available as CSS custom properties:

```css
:root {
  --font-inter: 'Inter', Arial, Helvetica, sans-serif;
  --font-anuphan: 'Anuphan', 'Inter', Arial, Helvetica, sans-serif;
}
```

## Language Attributes

The system automatically sets appropriate `lang` attributes:

- `lang="en"` for English text
- `lang="th"` for Thai text
- `lang="th-TH"` for Thai (Thailand)

## Demo Page

Visit `/font-demo` to see the font system in action with interactive examples.

## Best Practices

1. **Use AutoFont for dynamic content**: When displaying user-generated or database content
2. **Use specific classes for static content**: When you know the language in advance
3. **Set appropriate lang attributes**: For accessibility and SEO
4. **Test with mixed content**: Ensure proper font switching with bilingual text
5. **Consider performance**: Font files are loaded efficiently with `display: swap`

## Browser Support

- **Inter**: Modern browsers with good Thai font support
- **Anuphan**: Modern browsers with excellent Thai font rendering
- **Fallback**: Arial, Helvetica, sans-serif for older browsers

## Troubleshooting

### Font not loading
- Check network connectivity
- Verify font imports in `layout.tsx`
- Check browser console for errors

### Incorrect font detection
- Verify Unicode range detection
- Test with known Thai/English text
- Check for special characters

### Performance issues
- Fonts are optimized with `display: swap`
- Consider preloading critical fonts
- Monitor font loading metrics 