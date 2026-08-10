import { describe, expect, it } from 'vitest';
import { getSignInHeroCopy } from './signin-appkit-copy';

describe('getSignInHeroCopy', () => {
  it('reads login hero copy from the stored AppKit localization snapshot', () => {
    const value = JSON.stringify({
      config: {
        defaultLanguage: 'en',
        translations: { en: {
          'auth.login.hero.eyebrow': 'One workspace',
          'auth.login.hero.title': 'Hire with clarity.',
          'auth.login.hero.description': 'A better hiring flow.',
        } },
      },
    });

    expect(getSignInHeroCopy([{ key: 'appkitLocalizationConfig', value } as never])).toEqual({
      eyebrow: 'One workspace',
      title: 'Hire with clarity.',
      description: 'A better hiring flow.',
    });
  });

  it('uses safe defaults for an invalid snapshot', () => {
    expect(getSignInHeroCopy([{ key: 'appkitLocalizationConfig', value: '{' } as never]).eyebrow).toBe('Hiring intelligence, simplified');
  });
});
