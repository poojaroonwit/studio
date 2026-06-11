import { describe, expect, it } from 'vitest';

import {
  buildSystemSettingsSavePayload,
  parseLockoutAlertEmails,
  parseSystemSettingsViewState,
} from './system-settings-page-model';
import {
  getAppConfigChangeDetail,
  getSystemSettingsSaveErrorMessage,
  normalizeSystemSettingsResponse,
} from './system-settings-utils';

describe('system settings utilities', () => {
  it('normalizes array and object response formats', () => {
    expect(normalizeSystemSettingsResponse({
      settings: [
        { key: 'emailServiceEnabled', value: 'true' },
        { key: 'processorIntervalMs', value: '2000' },
      ],
    })).toEqual({
      emailServiceEnabled: 'true',
      processorIntervalMs: '2000',
    });

    expect(normalizeSystemSettingsResponse({ emailServiceEnabled: 'false' })).toEqual({
      emailServiceEnabled: 'false',
    });
    expect(normalizeSystemSettingsResponse(null)).toEqual({});
  });

  it('extracts save error messages with fallback text', () => {
    expect(getSystemSettingsSaveErrorMessage({ message: 'Invalid settings' })).toBe('Invalid settings');
    expect(getSystemSettingsSaveErrorMessage({ message: 123 })).toBe('Failed to save settings');
    expect(getSystemSettingsSaveErrorMessage(null)).toBe('Failed to save settings');
    expect(getSystemSettingsSaveErrorMessage({})).toBe('Failed to save settings');
  });

  it('builds app config change details from saved settings', () => {
    expect(getAppConfigChangeDetail([
      { key: 'appName', value: 'Studio' },
      { key: 'appLogoDataUrl', value: '/logo.png' },
    ])).toEqual({
      changed: true,
      appName: 'Studio',
      logoUrl: '/logo.png',
    });

    expect(getAppConfigChangeDetail([{ key: 'other', value: 'x' }])).toEqual({
      changed: false,
      appName: null,
      logoUrl: null,
    });
  });

  it('detects organization branding changes for app config refreshes', () => {
    expect(getAppConfigChangeDetail([
      { key: 'organizationName', value: 'Acme' },
      { key: 'organizationLogoDataUrl', value: 'data:image/png;base64,logo' },
    ])).toEqual({
      changed: true,
      appName: 'Acme',
      logoUrl: 'data:image/png;base64,logo',
    });
  });

  it('parses system settings into page view state', () => {
    const state = parseSystemSettingsViewState({
      maxConcurrentProcessors: '8',
      processQueueEnabled: 'false',
      processorQuietMode: 'true',
      emailSmtpPort: '2525',
      organizationName: 'Acme',
      organizationLogoDataUrl: '/org-logo.png',
      lockoutAlertEmails: '["security@example.com"]',
      showLogoOnly: true,
      pwaEnabled: 'true',
    });

    expect(state).toMatchObject({
      maxConcurrentProcessors: 8,
      processQueueEnabled: false,
      processorQuietMode: true,
      emailSmtpPort: 2525,
      organizationName: 'Acme',
      organizationLogoPreviewUrl: '/org-logo.png',
      savedOrganizationLogoUrl: '/org-logo.png',
      lockoutAlertEmails: ['security@example.com'],
      showLogoOnly: true,
      pwaEnabled: true,
    });
  });

  it('falls back to comma-separated lockout emails for legacy values', () => {
    expect(parseLockoutAlertEmails('a@example.com,b@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
    expect(parseLockoutAlertEmails(['a@example.com', '', 123])).toEqual(['a@example.com']);
    expect(parseLockoutAlertEmails('["a@example.com", "", 123]')).toEqual(['a@example.com']);
    expect(parseLockoutAlertEmails(null)).toEqual([]);
  });

  it('builds the system settings save payload from page state', () => {
    const state = parseSystemSettingsViewState({
      organizationName: 'Acme',
      organizationAddress: '1 Main St',
      organizationContact: 'ops@example.com',
      organizationLogoDataUrl: '/org-logo.png',
      lockoutAlertEmails: '["security@example.com"]',
    });

    const payload = buildSystemSettingsSavePayload(state);

    expect(payload).toContainEqual({ key: 'organizationName', value: 'Acme' });
    expect(payload).toContainEqual({ key: 'organizationAddress', value: '1 Main St' });
    expect(payload).toContainEqual({ key: 'organizationContact', value: 'ops@example.com' });
    expect(payload).toContainEqual({ key: 'organizationLogoDataUrl', value: '/org-logo.png' });
    expect(payload).toContainEqual({
      key: 'lockoutAlertEmails',
      value: JSON.stringify(['security@example.com']),
    });
  });
});
