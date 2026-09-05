import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('page scroll containment contract', () => {
  it('normalizes nested flex scrollers without overriding explicit min-height utilities', () => {
    const scrollCss = source('src/styles/base/scroll-area.css');

    expect(scrollCss).toContain(
      ':where(.flex-1.overflow-hidden, .flex-1.overflow-auto, .flex-1.overflow-y-auto)',
    );
    expect(scrollCss).toContain(':where(.h-full.flex.flex-col)');
    expect(scrollCss.match(/min-height:\s*0;/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the authenticated and settings shell scroll rails shrink-safe', () => {
    const appShell = source('src/components/layout/AppLayoutShell.tsx');
    const settingsShell = source('src/app/settings/SettingsClientLayout.tsx');

    expect(appShell).toContain('min-h-0 flex-1 overflow-y-auto');
    expect(settingsShell).toContain('min-h-0 flex-1 overflow-y-auto');
  });

  it('keeps high-risk Admin Center nested shells explicitly shrink-safe', () => {
    const adminDrawer = source('src/app/settings/AdminCenterConfigDrawer.tsx');
    const systemSettings = source('src/app/settings/system-settings/page.tsx');
    const systemSettingsTabs = source('src/app/settings/system-settings/SystemSettingsTabContent.tsx');
    const customFields = source('src/app/settings/custom-fields/page.tsx');
    const recruitmentStages = source('src/app/settings/stages/RecruitmentStagesPageView.tsx');
    const systemPrompts = source('src/app/settings/system-prompts/SystemPromptsPageView.tsx');

    expect(adminDrawer).toContain('flex h-full min-h-0 max-w-[1040px] flex-col');
    expect(systemSettings).toContain('flex h-full min-h-0 flex-col bg-background');
    expect(systemSettingsTabs).toContain('min-h-0 flex-1 overflow-hidden');
    expect(customFields).toContain('flex h-full min-h-0 flex-col');
    expect(recruitmentStages).toContain('flex h-full min-h-0 flex-col');
    expect(systemPrompts).toContain('flex h-full min-h-0 flex-col');
  });

  it('keeps nested ScrollArea-based settings tabs shrink-safe', () => {
    const promptList = source('src/app/settings/system-prompts/SystemPromptsListTab.tsx');
    const promptCategories = source('src/app/settings/system-prompts/SystemPromptCategoriesTab.tsx');
    const customFieldParts = source('src/app/settings/custom-fields/CustomFieldsPageParts.tsx');

    expect(promptList).toContain('min-h-0 flex-1 pr-4');
    expect(promptCategories).toContain('min-h-0 flex-1 pr-4');
    expect(customFieldParts).toContain('min-h-0 flex-1 p-6 pt-0');
  });
});
