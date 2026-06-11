import type { GlobalTalentSearchResult } from '../../services/globalTalentSearchService';

export type HeaderSearchResultType = 'applicant' | 'position' | 'user' | 'page' | 'action';

export interface HeaderSearchPageResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export type HeaderSearchTarget =
  | { type: 'route'; href: string }
  | { type: 'current-page-filter'; query: string }
  | { type: 'tasks-focus' };

export interface HeaderSearchResult {
  id: string;
  type: HeaderSearchResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  target?: HeaderSearchTarget;
}

export interface HeaderSearchResultsSource {
  applicants: GlobalTalentSearchResult[];
  positions: GlobalTalentSearchResult[];
  users: GlobalTalentSearchResult[];
}

export const EMPTY_HEADER_SEARCH_RESULTS: HeaderSearchResultsSource = {
  applicants: [],
  positions: [],
  users: [],
};

export const HEADER_PAGE_RESULTS: HeaderSearchPageResult[] = [
  { id: 'page-dashboard', title: 'Dashboard', subtitle: 'Overview', href: '/' },
  { id: 'page-applicants', title: 'Applicants', subtitle: 'Candidate management', href: '/applicants' },
  { id: 'page-positions', title: 'Positions', subtitle: 'Open roles and hiring', href: '/positions' },
  { id: 'page-my-tasks', title: 'My Tasks', subtitle: 'Task board', href: '/my-tasks' },
  { id: 'page-users', title: 'Users', subtitle: 'User management', href: '/settings/users' },
  { id: 'page-stages', title: 'Recruitment Stages', subtitle: 'Pipeline setup', href: '/settings/stages' },
  { id: 'page-custom-fields', title: 'Custom Fields', subtitle: 'Data configuration', href: '/settings/custom-fields' },
  { id: 'page-system-settings', title: 'System Settings', subtitle: 'Platform configuration', href: '/settings/system-settings' },
];

export function formatSearchMeta(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' - ');
}

export function getSearchResultBadge(type: HeaderSearchResultType) {
  switch (type) {
    case 'applicant':
      return 'Applicant';
    case 'position':
      return 'Position';
    case 'user':
      return 'User';
    case 'action':
      return 'Action';
    default:
      return 'Page';
  }
}

export function getSearchResultIconClassName(type: HeaderSearchResultType) {
  switch (type) {
    case 'applicant':
      return 'bg-blue-500/10 text-blue-600';
    case 'position':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'user':
      return 'bg-amber-500/10 text-amber-600';
    case 'action':
      return 'bg-violet-500/10 text-violet-600';
    default:
      return 'bg-slate-500/10 text-slate-600';
  }
}

export function filterHeaderPageResults(query: string, limit = 6) {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  return HEADER_PAGE_RESULTS.filter(
    page => page.title.toLowerCase().includes(trimmed) || page.subtitle?.toLowerCase().includes(trimmed)
  ).slice(0, limit);
}

export function getCurrentPageSearchAction(pathname: string | null | undefined, query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  if (pathname?.startsWith('/applicants')) {
    return {
      id: 'action-filter-applicants',
      type: 'action' as const,
      title: `Filter applicants by "${trimmed}"`,
      subtitle: 'Apply search in the current applicants page',
      target: { type: 'current-page-filter' as const, query: trimmed },
    };
  }

  if (pathname?.startsWith('/positions')) {
    return {
      id: 'action-filter-positions',
      type: 'action' as const,
      title: `Filter positions by "${trimmed}"`,
      subtitle: 'Apply search in the current positions page',
      target: { type: 'current-page-filter' as const, query: trimmed },
    };
  }

  if (pathname?.startsWith('/my-tasks')) {
    return {
      id: 'action-filter-mytasks',
      type: 'action' as const,
      title: `Filter tasks by "${trimmed}"`,
      subtitle: 'Apply search in the current tasks page',
      target: { type: 'tasks-focus' as const },
    };
  }

  return null;
}

export function buildHeaderSearchResults({
  currentPageAction,
  pageResults,
  results,
}: {
  currentPageAction: HeaderSearchResult | null;
  pageResults: HeaderSearchPageResult[];
  results: HeaderSearchResultsSource;
}): HeaderSearchResult[] {
  const mappedApplicants = results.applicants.map(result => ({
    id: `applicant-${result.id}`,
    type: 'applicant' as const,
    title: result.title,
    subtitle: result.subtitle,
    meta: result.meta,
    target: { type: 'route' as const, href: `/applicants?query=${encodeURIComponent(result.title)}` },
  }));

  const mappedPositions = results.positions.map(result => ({
    id: `position-${result.id}`,
    type: 'position' as const,
    title: result.title,
    subtitle: result.subtitle,
    meta: result.meta,
    target: { type: 'route' as const, href: `/positions/${result.id}` },
  }));

  const mappedUsers = results.users.map(result => ({
    id: `user-${result.id}`,
    type: 'user' as const,
    title: result.title,
    subtitle: result.subtitle,
    meta: result.meta,
    target: { type: 'route' as const, href: `/settings/users?search=${encodeURIComponent(result.title)}` },
  }));

  const mappedPages = pageResults.map(result => ({
    id: result.id,
    type: 'page' as const,
    title: result.title,
    subtitle: result.subtitle,
    target: { type: 'route' as const, href: result.href },
  }));

  return [
    ...(currentPageAction ? [currentPageAction] : []),
    ...mappedApplicants,
    ...mappedPositions,
    ...mappedUsers,
    ...mappedPages,
  ];
}
