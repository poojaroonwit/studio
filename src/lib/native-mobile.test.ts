import { describe, expect, it } from 'vitest';

import { isHriveNativeClient, isHriveNativeUserAgent } from './native-mobile';

describe('native mobile detection', () => {
  it('recognizes the Hrive native user-agent token', () => {
    expect(isHriveNativeUserAgent('Mozilla/5.0 HriveNative/1.0')).toBe(true);
    expect(isHriveNativeUserAgent('Mozilla/5.0 Safari/605.1.15')).toBe(false);
  });

  it('is server-safe when window is unavailable', () => {
    expect(isHriveNativeClient()).toBe(false);
  });
});
