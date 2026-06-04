import { describe, expect, it } from 'vitest';
import { sanitizeUrl } from './security';

describe('sanitizeUrl', () => {
  it('allows common safe URLs and relative paths', () => {
    expect(sanitizeUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf');
    expect(sanitizeUrl('/api/secure-file/preview?filePath=a.pdf')).toBe('/api/secure-file/preview?filePath=a.pdf');
    expect(sanitizeUrl('mailto:hr@example.com')).toBe('mailto:hr@example.com');
  });

  it('blocks executable or ambiguous URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeUrl('example.com/no-protocol')).toBe('');
  });
});
