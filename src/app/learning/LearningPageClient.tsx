"use client";

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightIcon,
  BookmarkIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ListBulletIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  QueueListIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import { UsersRound as CourseUsersIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { HrEmployeeSearchSelect } from '@/components/hr/HrEmployeeSearchSelect';
import { HrisStatusBadge } from '@/components/hris/HrisWorkspacePrimitives';
import {
  getLearningCourseCategoryChildren,
  getLearningCourseCategoryPath,
  parseLearningCourseCategories,
  type LearningCourseCategory,
} from '@/lib/learning-course-categories';
import {
  SortableNativeHeader,
  type SortDirection,
  sortRowsByColumn,
  type SortValueResolverMap,
} from '@/components/ui/sortable-table';
import { AiLearningBuilderDialog } from './AiLearningBuilderDialog';

export type LearningView = 'overview' | 'courses' | 'paths' | 'achievements' | 'certificates' | 'trusted-certificates' | 'onboarding';

const learningViewHeaders: Record<LearningView, { title: string; description: string }> = {
  overview: {
    title: 'Learning overview',
    description: 'Track courses, enrollments, certifications, and learning progress in one place.',
  },
  courses: {
    title: 'Courses',
    description: 'Build and manage the course catalog available to your workforce.',
  },
  paths: {
    title: 'Learning paths',
    description: 'Group courses into structured development journeys for employees.',
  },
  achievements: {
    title: 'Achievements',
    description: 'Celebrate completed learning, milestones, and earned recognition.',
  },
  certificates: {
    title: 'Employee certificates',
    description: 'Record and monitor employee certifications, validity, and renewal dates.',
  },
  'trusted-certificates': {
    title: 'Trusted certificates',
    description: 'Manage verified credentials and the organizations that issued them.',
  },
  onboarding: {
    title: 'Learning onboarding',
    description: 'Guide new employees through required learning and onboarding tasks.',
  },
};

const learningJourneyStops = [
  { view: 'courses' as const, label: 'Explore', href: '/learning/courses' },
  { view: 'paths' as const, label: 'Journey', href: '/learning/paths' },
  { view: 'achievements' as const, label: 'Celebrate', href: '/learning/achievements' },
  { view: 'certificates' as const, label: 'Credentials', href: '/learning/certificates' },
];

const learningJourneyCopy: Record<Exclude<LearningView, 'overview'>, {
  kicker: string;
  chapter: string;
  encouragement: string;
  nextLabel: string;
  nextHref: string;
}> = {
  onboarding: {
    kicker: 'Base Camp',
    chapter: 'Chapter 1',
    encouragement: 'Turn every first week into a confident beginning.',
    nextLabel: 'Explore courses',
    nextHref: '/learning/courses',
  },
  courses: {
    kicker: 'Explore new skills',
    chapter: 'Chapter 1',
    encouragement: 'Pick a skill, follow your curiosity, and keep moving.',
    nextLabel: 'Build a learning path',
    nextHref: '/learning/paths',
  },
  paths: {
    kicker: 'The Trail Map',
    chapter: 'Chapter 2',
    encouragement: 'Small, ordered steps make ambitious growth feel possible.',
    nextLabel: 'See achievements',
    nextHref: '/learning/achievements',
  },
  achievements: {
    kicker: 'The Summit',
    chapter: 'Chapter 3',
    encouragement: 'Every finished lesson leaves a mark worth celebrating.',
    nextLabel: 'View credentials',
    nextHref: '/learning/certificates',
  },
  certificates: {
    kicker: 'Expedition Passport',
    chapter: 'Chapter 4',
    encouragement: 'Keep hard-earned skills visible, trusted, and ready to share.',
    nextLabel: 'Trusted credentials',
    nextHref: '/learning/trusted-certificates',
  },
  'trusted-certificates': {
    kicker: 'Verified Collection',
    chapter: 'Credential desk',
    encouragement: 'A clear source of truth for qualifications that matter.',
    nextLabel: 'Back to Learning Home',
    nextHref: '/learning',
  },
};

type LearningRecord = Record<string, unknown> & { id: string };

interface LearningResource {
  records?: LearningRecord[];
}

interface LearningResponse {
  metrics?: Array<{ label: string; value: string | number; helper?: string }>;
  resource?: LearningResource;
  records?: LearningRecord[];
}

interface CourseForm {
  title: string;
  category: string;
  description: string;
  durationHours: string;
  isRequired: string;
  isActive: string;
}

interface CertificateForm {
  employeeId: string;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  validityMonths: string;
  verificationUrl: string;
  status: string;
}

interface OnboardingForm {
  employeeId: string;
  status: string;
  progress: string;
  startDate: string;
  targetDate: string;
}

interface LearningPathForm {
  title: string;
  description: string;
  status: string;
  courseIds: string[];
}

const courseFormDefault: CourseForm = {
  title: '',
  category: '',
  description: '',
  durationHours: '',
  isRequired: 'false',
  isActive: 'true',
};

const certificateFormDefault: CertificateForm = {
  employeeId: '',
  name: '',
  issuer: '',
  issuedAt: '',
  expiresAt: '',
  validityMonths: '',
  verificationUrl: '',
  status: 'active',
};

const onboardingFormDefault: OnboardingForm = {
  employeeId: '',
  status: 'not_started',
  progress: '0',
  startDate: '',
  targetDate: '',
};

const learningPathFormDefault: LearningPathForm = {
  title: '',
  description: '',
  status: 'draft',
  courseIds: [],
};

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value).replace(/_/g, ' ');
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanValue(primary: unknown, secondary?: unknown) {
  const value = primary ?? secondary;
  return value === true || value === 'true' || value === 1;
}

function isCourseActive(course: LearningRecord) {
  const value = recordValue(course, 'isActive', 'is_active');
  return value === undefined ? true : booleanValue(value);
}

function withoutEmptyValues<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')) as Partial<T>;
}

function recordValue(record: LearningRecord, camel: string, snake?: string) {
  return record[camel] ?? (snake ? record[snake] : undefined);
}

function stringArrayValue(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getRecords(payload: LearningResponse) {
  return payload.resource?.records || payload.records || [];
}

function normalizeStatus(status: unknown) {
  return String(status || 'active').toLowerCase();
}

function isTrustedCertificate(certificate: LearningRecord) {
  return recordValue(certificate, 'recordType', 'record_type') === 'trusted';
}

function formatDate(value: unknown) {
  if (!value) return 'No date';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return text(value);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function daysUntil(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function courseColor(category: unknown) {
  const value = String(category || '').toLowerCase();
  if (value.includes('compliance') || value.includes('security')) return 'bg-emerald-600';
  if (value.includes('lead') || value.includes('manager')) return 'bg-amber-600';
  if (value.includes('customer') || value.includes('service')) return 'bg-rose-600';
  if (value.includes('technical') || value.includes('data')) return 'bg-sky-600';
  return 'bg-indigo-600';
}

export function LearningPageClient({ view }: { view: LearningView }) {
  const [courses, setCourses] = React.useState<LearningRecord[]>([]);
  const [enrollments, setEnrollments] = React.useState<LearningRecord[]>([]);
  const [certificates, setCertificates] = React.useState<LearningRecord[]>([]);
  const [learningPaths, setLearningPaths] = React.useState<LearningRecord[]>([]);
  const [onboardingCases, setOnboardingCases] = React.useState<LearningRecord[]>([]);
  const [onboardingTemplates, setOnboardingTemplates] = React.useState<LearningRecord[]>([]);
  const [onboardingTasks, setOnboardingTasks] = React.useState<LearningRecord[]>([]);
  const [metrics, setMetrics] = React.useState<LearningResponse['metrics']>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [removingCourseId, setRemovingCourseId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = React.useState(false);
  const [onboardingDialogOpen, setOnboardingDialogOpen] = React.useState(false);
  const [learningPathDialogOpen, setLearningPathDialogOpen] = React.useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = React.useState(false);
  const [editingLearningPathId, setEditingLearningPathId] = React.useState<string | null>(null);
  const [courseForm, setCourseForm] = React.useState<CourseForm>(courseFormDefault);
  const [certificateForm, setCertificateForm] = React.useState<CertificateForm>(certificateFormDefault);
  const [onboardingForm, setOnboardingForm] = React.useState<OnboardingForm>(onboardingFormDefault);
  const [learningPathForm, setLearningPathForm] = React.useState<LearningPathForm>(learningPathFormDefault);
  const [courseCategories, setCourseCategories] = React.useState<LearningCourseCategory[]>([]);

  const loadCourseCategories = React.useCallback(async () => {
    try {
      const response = await fetch('/api/settings/system-settings?keys=learningCourseCategories', { credentials: 'include', cache: 'no-store' });
      const payload = await response.json() as { learningCourseCategories?: string };
      setCourseCategories(response.ok ? parseLearningCourseCategories(payload.learningCourseCategories) : parseLearningCourseCategories(undefined));
    } catch {
      // The parser provides the product defaults when the setting is unavailable.
      setCourseCategories(parseLearningCourseCategories(undefined));
    }
  }, []);

  const loadLearning = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (view === 'onboarding') {
        const responses = await Promise.all([
          fetch('/api/hr/onboarding', { credentials: 'include' }),
          fetch('/api/hr/onboarding?view=templates', { credentials: 'include' }),
          fetch('/api/hr/onboarding?view=tasks', { credentials: 'include' }),
        ]);
        if (!responses[0].ok) throw new Error('Unable to load onboarding data.');
        const payloads = await Promise.all(responses.map(async (response): Promise<LearningResponse> => response.ok ? response.json() as Promise<LearningResponse> : {}));
        setMetrics(payloads[0].metrics || []);
        setOnboardingCases(getRecords(payloads[0]));
        setOnboardingTemplates(getRecords(payloads[1]));
        setOnboardingTasks(getRecords(payloads[2]));
        return;
      }

      const requests = [
        fetch('/api/hr/learning', { credentials: 'include' }),
        fetch('/api/hr/learning?view=courses', { credentials: 'include' }),
        fetch('/api/hr/learning?view=certifications', { credentials: 'include' }),
      ];
      if (view === 'paths') requests.push(fetch('/api/hr/learning?view=paths', { credentials: 'include' }));
      const responses = await Promise.all(requests);
      if (!responses[0].ok) throw new Error('Unable to load learning data.');
      const payloads = await Promise.all(responses.map(async (response): Promise<LearningResponse> => response.ok ? response.json() as Promise<LearningResponse> : {}));
      setMetrics(payloads[0].metrics || []);
      setEnrollments(getRecords(payloads[0]));
      setCourses(getRecords(payloads[1]));
      setCertificates(getRecords(payloads[2]));
      setLearningPaths(getRecords(payloads[3] || {}));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load learning data.');
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  React.useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  React.useEffect(() => {
    void loadCourseCategories();
  }, [loadCourseCategories]);

  const submitCourse = async () => {
    if (!courseForm.title.trim()) {
      setError('Course title is required.');
      return;
    }
    if (!courseForm.category.trim()) {
      setError('Choose a course category.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/learning?view=courses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withoutEmptyValues(courseForm)),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'Unable to create course.');
      }
      setCourseDialogOpen(false);
      setCourseForm(courseFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create course.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeCourse = async (course: LearningRecord) => {
    const title = text(course.title, 'this course');
    if (!window.confirm(`Remove “${title}” from the course catalog? Existing learning history will be preserved.`)) return;

    setRemovingCourseId(course.id);
    setError(null);
    try {
      const response = await fetch(`/api/hr/learning?view=courses&id=${encodeURIComponent(course.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'Unable to remove course.');
      }
      await loadLearning();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove course.');
    } finally {
      setRemovingCourseId(null);
    }
  };

  const submitCertificate = async () => {
    const isTrustedRegistration = view === 'trusted-certificates';
    if (!certificateForm.name.trim() || (!isTrustedRegistration && !certificateForm.employeeId.trim())) {
      setError(isTrustedRegistration ? 'Certificate name is required.' : 'Employee ID and certificate name are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/learning?view=certifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...withoutEmptyValues({
            ...certificateForm,
            employeeId: isTrustedRegistration ? '' : certificateForm.employeeId,
            issuedAt: isTrustedRegistration ? '' : certificateForm.issuedAt,
            expiresAt: isTrustedRegistration ? '' : certificateForm.expiresAt,
            validityMonths: isTrustedRegistration ? certificateForm.validityMonths : '',
            verificationUrl: isTrustedRegistration ? certificateForm.verificationUrl : '',
          }),
          recordType: isTrustedRegistration ? 'trusted' : 'employee',
          verificationStatus: isTrustedRegistration ? 'verified' : 'pending',
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'Unable to add certificate.');
      }
      setCertificateDialogOpen(false);
      setCertificateForm(certificateFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add certificate.');
    } finally {
      setIsSaving(false);
    }
  };

  const verifyCertificate = async (certificateId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/hr/learning?view=certifications&id=${encodeURIComponent(certificateId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'verified' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'Unable to verify certificate.');
      }
      await loadLearning();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify certificate.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitOnboarding = async () => {
    if (!onboardingForm.employeeId.trim()) {
      setError('Employee ID is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/hr/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withoutEmptyValues(onboardingForm)),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || 'Unable to start onboarding.');
      }
      setOnboardingDialogOpen(false);
      setOnboardingForm(onboardingFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to start onboarding.');
    } finally {
      setIsSaving(false);
    }
  };

  const openNewLearningPath = () => {
    setEditingLearningPathId(null);
    setLearningPathForm(learningPathFormDefault);
    setError(null);
    setLearningPathDialogOpen(true);
  };

  const openEditLearningPath = (path: LearningRecord) => {
    setEditingLearningPathId(path.id);
    setLearningPathForm({
      title: text(path.title, ''),
      description: text(path.description, ''),
      status: normalizeStatus(path.status),
      courseIds: stringArrayValue(recordValue(path, 'courseIds', 'course_ids')),
    });
    setError(null);
    setLearningPathDialogOpen(true);
  };

  const submitLearningPath = async () => {
    if (!learningPathForm.title.trim()) {
      setError('Path title is required.');
      return;
    }
    if (!learningPathForm.courseIds.length) {
      setError('Choose at least one course for this path.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const query = new URLSearchParams({ view: 'paths' });
      if (editingLearningPathId) query.set('id', editingLearningPathId);
      const response = await fetch(`/api/hr/learning?${query.toString()}`, {
        method: editingLearningPathId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(learningPathForm),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || `Unable to ${editingLearningPathId ? 'update' : 'create'} learning path.`);
      }
      setLearningPathDialogOpen(false);
      setEditingLearningPathId(null);
      setLearningPathForm(learningPathFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save learning path.');
    } finally {
      setIsSaving(false);
    }
  };

  const primaryAction = view === 'certificates' || view === 'trusted-certificates'
    ? () => setCertificateDialogOpen(true)
    : view === 'onboarding'
      ? () => setOnboardingDialogOpen(true)
      : view === 'paths'
        ? openNewLearningPath
        : () => setCourseDialogOpen(true);
  const primaryLabel = view === 'trusted-certificates'
    ? 'Register trusted certificate'
    : view === 'certificates'
      ? 'Add employee certificate'
      : view === 'onboarding'
        ? 'Start onboarding'
        : view === 'paths'
          ? 'Create path'
          : view === 'overview' || view === 'courses'
            ? 'Create course'
            : 'Add course';
  const pageHeader = learningViewHeaders[view];

  return (
    <main className={cn('min-h-full w-full max-w-none text-slate-950 dark:text-zinc-50', view !== 'overview' && 'bg-[#f6f8fc] px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8')}>
      <div className={cn('flex w-full max-w-none flex-col', view === 'overview' ? 'gap-0' : 'gap-6')}>
        {view !== 'overview' && (
          <LearningJourneyHeader
            view={view}
            title={pageHeader.title}
            description={pageHeader.description}
            primaryLabel={primaryLabel}
            onPrimaryAction={primaryAction}
            onAiCreate={view === 'courses' || view === 'paths' ? () => setAiBuilderOpen(true) : undefined}
          />
        )}

        {error && (
          <div role="alert" className={cn('rounded-[8px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300', view === 'overview' && 'mx-4 mt-4 sm:mx-6 lg:mx-8')}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={cn(view === 'overview' && 'p-4 sm:p-6 lg:p-8')}><LoadingSurface /></div>
        ) : view === 'overview' ? (
          <LearningOverview courses={courses} enrollments={enrollments} certificates={certificates} metrics={metrics || []} />
        ) : view === 'courses' ? (
          <CourseCatalog
            courses={courses}
            onAddNew={() => setCourseDialogOpen(true)}
            onRemove={course => void removeCourse(course)}
            removingCourseId={removingCourseId}
          />
        ) : view === 'paths' ? (
          <LearningPaths
            paths={learningPaths}
            courses={courses}
            enrollments={enrollments}
            onCreatePath={openNewLearningPath}
            onConfigurePath={openEditLearningPath}
          />
        ) : view === 'achievements' ? (
          <AchievementJourney courses={courses} enrollments={enrollments} certificates={certificates} />
        ) : view === 'certificates' || view === 'trusted-certificates' ? (
          <CertificateRegister
            certificates={certificates}
            mode={view === 'trusted-certificates' ? 'trusted' : 'employee'}
            isSaving={isSaving}
            onAdd={() => setCertificateDialogOpen(true)}
            onVerify={certificateId => void verifyCertificate(certificateId)}
          />
        ) : (
          <OnboardingWorkspace cases={onboardingCases} templates={onboardingTemplates} tasks={onboardingTasks} metrics={metrics || []} />
        )}
      </div>

      <CourseDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        form={courseForm}
        setForm={setCourseForm}
        categories={courseCategories}
        isSaving={isSaving}
        onSubmit={() => void submitCourse()}
      />
      <CertificateDialog
        open={certificateDialogOpen}
        onOpenChange={setCertificateDialogOpen}
        form={certificateForm}
        setForm={setCertificateForm}
        isSaving={isSaving}
        trusted={view === 'trusted-certificates'}
        onSubmit={() => void submitCertificate()}
      />
      <OnboardingDialog
        open={onboardingDialogOpen}
        onOpenChange={setOnboardingDialogOpen}
        form={onboardingForm}
        setForm={setOnboardingForm}
        isSaving={isSaving}
        onSubmit={() => void submitOnboarding()}
      />
      <LearningPathDialog
        open={learningPathDialogOpen}
        onOpenChange={setLearningPathDialogOpen}
        form={learningPathForm}
        setForm={setLearningPathForm}
        courses={courses}
        isSaving={isSaving}
        isEditing={Boolean(editingLearningPathId)}
        onSubmit={() => void submitLearningPath()}
      />
      <AiLearningBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
        initialType={view === 'paths' ? 'path' : 'course'}
        onCreated={() => void loadLearning()}
      />
    </main>
  );
}

function LearningJourneyHeader({
  view,
  title,
  description,
  primaryLabel,
  onPrimaryAction,
  onAiCreate,
}: {
  view: Exclude<LearningView, 'overview'>;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  onAiCreate?: () => void;
}) {
  const copy = learningJourneyCopy[view];
  const activeStop = learningJourneyStops.findIndex(stop => stop.view === view);
  const HeaderIcon = view === 'onboarding'
    ? UserGroupIcon
    : view === 'courses'
      ? BookOpenIcon
      : view === 'paths'
        ? MapPinIcon
        : view === 'achievements'
          ? TrophyIcon
          : CheckBadgeIcon;

  return (
    <header className="relative isolate overflow-hidden rounded-[24px] border border-[#dbe3eb] bg-[#f8f4ec] shadow-[0_18px_45px_rgba(30,48,87,0.09)] dark:border-zinc-800 dark:bg-zinc-900">
      <Image src="/learning/adventure-trail-hero.png" alt="" fill priority unoptimized sizes="100vw" className="z-0 object-cover object-[62%_48%] dark:brightness-[.58] dark:saturate-[.72]" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#fbfaf6] via-[#fbfaf6]/95 to-[#fbfaf6]/10 dark:from-zinc-950 dark:via-zinc-950/92 dark:to-zinc-950/5" aria-hidden="true" />

      <div className="relative z-10 grid min-h-[286px] lg:grid-cols-[minmax(0,1fr)_42%]">
        <div className="flex flex-col justify-center px-6 py-9 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#5873a4] dark:text-blue-300">
            <span>{copy.chapter}</span>
            <span className="h-1 w-1 rounded-full bg-current opacity-50" />
            <span>{copy.kicker}</span>
          </div>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.04] tracking-[-0.045em] text-[#172033] dark:text-zinc-50">{title}</h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-[#66758a] dark:text-zinc-300">{description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onPrimaryAction} className="h-11 rounded-lg bg-[#316be8] px-5 font-semibold shadow-md shadow-indigo-950/15 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#285dce]">
              <PlusIcon className="mr-2 h-4 w-4" />
              {primaryLabel}
            </Button>
            {onAiCreate && (
              <Button type="button" variant="outline" onClick={onAiCreate} className="h-11 rounded-lg border-[#b9c9d8] bg-white/75 px-4 font-semibold text-[#244b44] shadow-sm backdrop-blur-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/75 dark:text-zinc-100 dark:hover:bg-zinc-900">
                <SparklesIcon className="mr-2 h-4 w-4 text-[#316be8]" />
                Create with AI
              </Button>
            )}
            <Link href={copy.nextHref} className="group inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-[#3e5169] transition-colors hover:bg-white/70 dark:text-zinc-200 dark:hover:bg-zinc-800/80">
              {copy.nextLabel}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="relative hidden items-center justify-center px-8 lg:flex">
          <div className="absolute left-[18%] top-[34%] h-24 border-l-2 border-dashed border-white/85" aria-hidden="true" />
          <div className="relative -mt-8 grid h-20 w-16 place-items-center text-[#316be8] drop-shadow-lg">
            <MapPinIcon className="absolute h-20 w-20 fill-white stroke-[1.5]" />
            <HeaderIcon className="relative -mt-5 h-7 w-7 stroke-[1.7]" />
          </div>
          <p className="absolute bottom-5 right-6 max-w-[250px] rounded-xl bg-[#172033]/90 px-4 py-3 text-sm font-medium leading-5 text-white shadow-xl backdrop-blur-sm">{copy.encouragement}</p>
        </div>
      </div>

      <nav aria-label="Learning journey" className="relative z-10 flex overflow-x-auto border-t border-slate-200/80 bg-white/95 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6">
        {learningJourneyStops.map((stop, index) => {
          const isActive = stop.view === view;
          const isComplete = activeStop > index || view === 'trusted-certificates';
          return (
            <React.Fragment key={stop.view}>
              {index > 0 && <span className={cn('mt-3 h-px min-w-4 flex-1 border-t border-dashed', isComplete || isActive ? 'border-[#6e8ed6]' : 'border-slate-300 dark:border-zinc-700')} aria-hidden="true" />}
              <Link href={stop.href} aria-current={isActive ? 'page' : undefined} className="group flex shrink-0 items-center gap-2 px-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                <span className={cn(
                  'grid h-6 w-6 place-items-center rounded-full border text-[10px] transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'border-[#316be8] bg-[#316be8] text-white shadow-sm shadow-indigo-500/30' : isComplete ? 'border-[#4db78a] bg-[#4db78a] text-white' : 'border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-900',
                )}>{isComplete ? <CheckIcon className="h-3.5 w-3.5 stroke-[2.5]" /> : index + 1}</span>
                <span className={cn(isActive && 'text-slate-950 dark:text-white')}>{stop.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
    </header>
  );
}

function LearningOverview({
  courses,
  enrollments,
  certificates,
  metrics,
}: {
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  certificates: LearningRecord[];
  metrics: Array<{ label: string; value: string | number; helper?: string }>;
}) {
  const completed = enrollments.filter(item => normalizeStatus(item.status) === 'completed').length;
  const inProgress = enrollments.filter(item => normalizeStatus(item.status) === 'in_progress');
  const currentEnrollment = inProgress[0] || enrollments.find(item => normalizeStatus(item.status) !== 'completed');
  const currentCourse = courses.find(course => course.id === recordValue(currentEnrollment || {}, 'courseId', 'course_id')) || courses.find(isCourseActive);
  const progressValue = currentEnrollment ? Math.min(100, Math.max(0, numberValue(currentEnrollment.progress))) : 65;
  const currentTitle = text(currentCourse?.title, 'Confident Conversations');
  const currentLesson = text(recordValue(currentEnrollment || {}, 'currentLessonTitle', 'current_lesson_title'), 'Giving feedback that lands');
  const continueHref = currentCourse?.id ? `/learning/courses/${currentCourse.id}` : '/learning/courses';
  const availableNext = courses.filter(course => course.id !== currentCourse?.id && isCourseActive(course)).slice(0, 2);
  const upNext = [
    { title: text(availableNext[0]?.title, 'Navigating difficult conversations'), description: text(availableNext[0]?.description, 'Approach challenging conversations with confidence and clarity.'), minutes: 22, color: 'bg-[#ef7448]', step: 6, href: availableNext[0]?.id ? `/learning/courses/${availableNext[0].id}` : '/learning/courses' },
    { title: text(availableNext[1]?.title, 'Coaching for growth'), description: text(availableNext[1]?.description, 'Help your team set goals and take action.'), minutes: 20, color: 'bg-[#e7ad35]', step: 7, href: availableNext[1]?.id ? `/learning/courses/${availableNext[1].id}` : '/learning/paths' },
  ];
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const completionCopy = completed > 0 ? `${completed} course${completed === 1 ? '' : 's'} completed so far.` : 'Your first milestone is closer than it looks.';

  return (
    <div className="bg-[#f7f9fc] font-sans text-slate-950 [font-feature-settings:'kern','liga'] [font-kerning:normal]">
      <section className="relative isolate min-h-[610px] overflow-hidden border-b border-slate-200">
        <Image src="/learning/adventure-trail-hero.png" alt="A mountain trail winding toward a summit" fill priority unoptimized sizes="100vw" className="z-0 object-cover object-center" />
        <div className="absolute inset-0 z-[1] bg-white/10" aria-hidden="true" />

        <div className="mx-auto grid min-h-[610px] w-full max-w-[1600px] items-center px-4 py-12 sm:px-6 lg:grid-cols-[minmax(420px,640px)_1fr] lg:px-10 xl:px-14">
          <div className="relative z-10">
            <p className="text-sm font-medium leading-5 text-[#5873a4]">{dateLabel}</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[#172033] sm:text-[2.875rem]">Adventure Trail</h1>
            <p className="mt-3 text-xl font-normal leading-7 tracking-[-0.015em] text-slate-600 sm:text-[1.375rem]">Grow your skills. Achieve more together.</p>

            <article className="mt-8 rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:p-7">
              <p className="text-xs font-bold uppercase leading-4 tracking-[0.06em] text-[#316be8]">Pick up where you left off</p>
              <div className="mt-4 flex items-start gap-4 border-b border-slate-200 pb-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#637bea] text-white shadow-sm"><CourseUsersIcon className="h-7 w-7 stroke-[1.6]" /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-[1.375rem] font-semibold leading-7 tracking-[-0.02em] text-[#172033]">{currentTitle}</h2>
                  <p className="mt-1 text-base font-normal leading-6 text-slate-500">Course</p>
                </div>
              </div>

              <div className="grid gap-6 pt-5 sm:grid-cols-[minmax(0,1fr)_190px]">
                <div>
                  <p className="text-sm font-normal leading-5 text-slate-500">Current lesson</p>
                  <h3 className="mt-1 text-xl font-semibold leading-7 tracking-[-0.015em] text-[#172033]">{currentLesson}</h3>
                  <p className="mt-2 max-w-[38ch] text-base font-normal leading-6 text-slate-600">Learn how to deliver feedback that inspires action and builds trust.</p>
                </div>
                <div>
                  <div className="flex items-end justify-between gap-3"><p className="text-sm font-normal leading-5 text-slate-500">Your progress</p><p className="text-[1.75rem] font-bold leading-none tabular-nums text-[#316be8]">{progressValue}%</p></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Course progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressValue}>
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progressValue}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5 text-base font-medium leading-6 text-slate-600">
                  <span className="inline-flex items-center gap-2"><ClockIcon className="h-5 w-5 stroke-[1.7]" />18 min</span>
                  <span className="inline-flex items-center gap-2"><BookmarkIcon className="h-5 w-5 stroke-[1.7]" />Lesson 5 of 8</span>
                </div>
                <Button asChild className="h-12 rounded-lg bg-[#316be8] px-5 text-base font-semibold shadow-md shadow-indigo-950/15 hover:bg-[#285dce] focus-visible:ring-indigo-500">
                  <Link href={continueHref}>Continue learning <ArrowRightIcon className="ml-2 h-5 w-5 stroke-2" /></Link>
                </Button>
              </div>
            </article>
          </div>

          <div className="pointer-events-none relative z-10 hidden h-full lg:block" aria-hidden="true">
            {[
              { step: 5, className: 'left-[18%] top-[55%]', color: 'text-indigo-600' },
              { step: 6, className: 'left-[47%] top-[40%]', color: 'text-[#ef7448]' },
              { step: 7, className: 'left-[67%] top-[27%]', color: 'text-[#e7ad35]' },
              { step: 8, className: 'left-[83%] top-[9%]', color: 'text-emerald-600' },
            ].map(marker => (
              <div key={marker.step} className={cn('absolute grid h-16 w-12 place-items-center drop-shadow-lg', marker.className)}>
                <MapPinIcon className={cn('absolute h-16 w-16 fill-white stroke-[1.5]', marker.color)} />
                <span className={cn('relative -mt-4 text-sm font-black', marker.color)}>{marker.step}</span>
              </div>
            ))}
            <div className="absolute bottom-[7%] right-[5%] max-w-64 rounded-xl bg-slate-950/90 px-5 py-4 text-white shadow-xl backdrop-blur">
              <div className="flex gap-3"><SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 stroke-[1.7] text-slate-100" /><div><p className="text-base font-semibold leading-6">Keep going!</p><p className="mt-1 text-sm font-normal leading-5 text-slate-200">{completionCopy}</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 xl:px-14">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><FireIconSolid className="h-5 w-5 text-[#f48a5b]" /><h2 className="text-base font-semibold leading-6">Learning streak</h2></div>
          <p className="mt-5 text-base font-semibold leading-6">4 of 5 days this week</p>
          <p className="mt-1 text-sm font-normal leading-5 text-slate-500">Nice work—keep the streak alive!</p>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <div key={day} className="text-center">
                <span className={cn('mx-auto grid h-9 w-9 place-items-center rounded-full border text-white', index < 4 ? 'border-emerald-500 bg-emerald-500' : index === 4 ? 'border-dashed border-slate-400 bg-white text-slate-400' : 'border-slate-100 bg-slate-100 text-slate-300')}>
                  {index < 4 ? <CheckIcon className="h-5 w-5 stroke-[2.5]" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span className="mt-2 block text-sm font-normal leading-5 text-slate-600">{day}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><QueueListIcon className="h-5 w-5 stroke-[1.7] text-slate-600" /><h2 className="text-base font-semibold leading-6">Up next</h2></div><p className="mt-1 text-sm font-normal leading-5 text-slate-500">Your upcoming lessons</p></div><Link href="/learning/paths" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">View path <ArrowRightIcon className="h-4 w-4 stroke-[1.7]" /></Link></div>
          <div className="mt-4 divide-y divide-slate-200">
            {upNext.map(item => (
              <Link key={item.step} href={item.href} className="group flex items-center gap-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-semibold text-white', item.color)}>{item.step}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-base font-semibold leading-6 group-hover:text-indigo-700">{item.title}</span><span className="mt-1 block truncate text-sm font-normal leading-5 text-slate-500">{item.description}</span></span>
                <span className="hidden text-sm font-normal leading-5 tabular-nums text-slate-500 sm:block">{item.minutes} min</span>
                <ChevronRightIcon className="h-5 w-5 stroke-[1.7] text-slate-500 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function CourseCatalog({ courses, onAddNew, onRemove, removingCourseId }: {
  courses: LearningRecord[];
  onAddNew: () => void;
  onRemove: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const [display, setDisplay] = React.useState<'grid' | 'list'>('grid');
  const catalogCourses = courses.filter(isCourseActive);
  const categories = Array.from(new Set(catalogCourses.map(course => text(course.category, 'General')))).sort();
  const filtered = catalogCourses.filter(course => {
    const matchesQuery = `${text(course.title, '')} ${text(course.description, '')} ${text(course.category, '')}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'all' || text(course.category, 'General') === category);
  });

  if (catalogCourses.length === 0) {
    return (
      <EmptyState
        icon={AcademicCapIcon}
        title="Build your learning catalog"
        description="Start with one useful course. Add the duration, category, and whether every employee needs to complete it."
        action="Create first course"
        onAction={onAddNew}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-[#fbfaf5] shadow-[0_10px_35px_rgba(30,48,42,.06)] dark:border-zinc-800 dark:bg-[#171d1a]">
        <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search courses</span>
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search title, category, or topic"
            className="h-11 rounded-xl border-0 bg-white pl-9 shadow-none focus-visible:ring-2 focus-visible:ring-[#6b8e7f] dark:bg-white/5"
          />
        </label>
        <div className="flex rounded-md border border-slate-200 p-0.5 dark:border-zinc-700">
          <button type="button" onClick={() => setDisplay('grid')} aria-label="Grid view" aria-pressed={display === 'grid'} className={cn('grid h-8 w-9 place-items-center rounded text-slate-500', display === 'grid' && 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950')}>
            <RectangleGroupIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setDisplay('list')} aria-label="List view" aria-pressed={display === 'list'} className={cn('grid h-8 w-9 place-items-center rounded text-slate-500', display === 'list' && 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950')}>
            <ListBulletIcon className="h-4 w-4" />
          </button>
        </div>
        </div>
        <nav aria-label="Course categories" className="flex gap-2 overflow-x-auto border-t border-slate-200 px-3 py-3 [scrollbar-width:none] dark:border-white/10">
          <button type="button" onClick={() => setCategory('all')} aria-pressed={category === 'all'} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors', category === 'all' ? 'bg-[#173f35] text-[#f7f4e9]' : 'text-slate-600 hover:bg-[#e8eadf] hover:text-[#173f35] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white')}>All courses</button>
          {categories.map(item => (
            <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors', category === item ? 'bg-[#173f35] text-[#f7f4e9]' : 'text-slate-600 hover:bg-[#e8eadf] hover:text-[#173f35] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white')}>{item}</button>
          ))}
        </nav>
      </section>

      {category !== 'all' && (
        <section className="relative overflow-hidden rounded-[24px] bg-[#e5e9d9] px-6 py-7 text-[#173f35] dark:bg-[#1c2923] dark:text-[#e9f0eb] sm:px-8 sm:py-9">
          <span className="pointer-events-none absolute -right-12 -top-20 h-44 w-44 rounded-full border-[28px] border-[#d6df6d] opacity-80" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65776e] dark:text-[#a9b9b0]">Selected collection</p>
              <h2 className="mt-2 max-w-2xl text-[clamp(1.8rem,4vw,3.25rem)] font-semibold leading-none tracking-[-.05em]">{category}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#52665d] dark:text-[#b9c8c0]">A focused collection for building practical {category.toLowerCase()} capability across your team.</p>
            </div>
            <div className="relative flex items-center gap-4 pr-16 sm:pr-0">
              <span className="text-4xl font-semibold tracking-[-.06em]">{filtered.length}</span>
              <span className="max-w-20 text-xs font-bold uppercase leading-4 tracking-[.12em] text-[#65776e] dark:text-[#a9b9b0]">course{filtered.length === 1 ? '' : 's'} available</span>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">{category === 'all' ? `${filtered.length} course${filtered.length === 1 ? '' : 's'} in the catalog` : query ? `${filtered.length} matching course${filtered.length === 1 ? '' : 's'}` : `Explore ${category}`}</p>
        {(query || category !== 'all') && (
          <button type="button" onClick={() => { setQuery(''); setCategory('all'); }} className="text-xs font-semibold text-[#315f50] hover:underline dark:text-[#9bc4b1]">
            View all courses
          </button>
        )}
      </div>

      {filtered.length ? (
        display === 'grid'
          ? <CourseGrid courses={filtered} onRemove={onRemove} removingCourseId={removingCourseId} />
          : <CourseList courses={filtered} onRemove={onRemove} removingCourseId={removingCourseId} />
      ) : (
        <EmptyInline title="No courses match" description="Try a broader search or clear the category filter." />
      )}
    </div>
  );
}

function CourseGrid({ courses, onRemove, removingCourseId }: {
  courses: LearningRecord[];
  onRemove: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {courses.map(course => (
        <article key={course.id} className="group flex min-h-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(30,48,87,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(49,107,232,0.14)] dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-indigo-800 dark:hover:bg-zinc-900">
          <div className="relative flex h-24 items-start justify-between overflow-hidden bg-[#eaf3f5] px-5 pt-4 text-[#35536d] dark:bg-[#243342] dark:text-blue-200">
            <BookOpenIcon className="relative z-10 h-7 w-7 stroke-[1.5] transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110" />
            <span className="relative z-10 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] dark:bg-zinc-900/70">{text(course.category, 'General')}</span>
            <span className="absolute right-7 top-4 h-8 w-8 rounded-full bg-[#f4c95d] opacity-80" aria-hidden="true" />
            <span className="absolute -bottom-12 -left-8 h-24 w-48 rotate-6 rounded-[50%] bg-[#93b89a]" aria-hidden="true" />
            <span className="absolute -bottom-14 left-[28%] h-24 w-56 -rotate-3 rounded-[50%] bg-[#6f977d]" aria-hidden="true" />
            <span className={cn('absolute bottom-0 left-0 h-1.5 w-full', courseColor(course.category))} aria-hidden="true" />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Ready to explore</p>
              <StatusPill status={isCourseActive(course) ? 'active' : 'archived'} />
            </div>
            <Link href={`/learning/courses/${course.id}`} className="mt-4 block">
              <h2 className="line-clamp-2 text-lg font-semibold leading-6 tracking-[-0.02em] group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{text(course.title, 'Untitled course')}</h2>
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-500 dark:text-zinc-400">{text(course.description, 'Add a short description so employees know what they will learn.')}</p>
            <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5"><ClockIcon className="h-4 w-4" />{text(recordValue(course, 'durationHours', 'duration_hours'), '0')}h</span>
              {booleanValue(course.isRequired, course.is_required) && <span className="inline-flex items-center gap-1.5 font-semibold text-[#7b5531] dark:text-amber-300"><ShieldCheckIcon className="h-4 w-4" />Required</span>}
              <button
                type="button"
                onClick={() => onRemove(course)}
                disabled={removingCourseId === course.id}
                className="ml-auto inline-flex items-center font-semibold text-rose-600 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
                aria-label={`Remove ${text(course.title, 'course')}`}
              >
                <TrashIcon className="mr-1 h-4 w-4" />
                {removingCourseId === course.id ? 'Removing…' : 'Remove'}
              </button>
              <Link href={`/learning/courses/${course.id}/studio`} className="font-semibold hover:text-slate-950 dark:hover:text-white">Studio</Link>
              <Link href={`/learning/courses/${course.id}`} className="inline-flex items-center font-semibold text-indigo-700 dark:text-indigo-300">Open <ChevronRightIcon className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function CourseList({ courses, onRemove, removingCourseId }: {
  courses: LearningRecord[];
  onRemove: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  return (
    <section className="divide-y divide-slate-100 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
      {courses.map(course => (
        <article key={course.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900 sm:grid-cols-[8px_minmax(0,1fr)_120px_110px_90px_100px] sm:items-center">
          <div className={cn('h-full min-h-10 w-2', courseColor(course.category))} />
          <div className="min-w-0">
            <Link href={`/learning/courses/${course.id}`} className="truncate text-sm font-semibold hover:text-indigo-700 dark:hover:text-indigo-300">{text(course.title, 'Untitled course')}</Link>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-zinc-400">{text(course.description, 'No description')}</p>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{text(course.category, 'General')}</p>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400"><ClockIcon className="h-4 w-4" />{text(recordValue(course, 'durationHours', 'duration_hours'), '0')} hours</span>
          <StatusPill status={isCourseActive(course) ? 'active' : 'archived'} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRemove(course)}
            disabled={removingCourseId === course.id}
            className="justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 sm:justify-center"
          >
            <TrashIcon className="mr-1.5 h-4 w-4" />
            {removingCourseId === course.id ? 'Removing…' : 'Remove'}
          </Button>
        </article>
      ))}
    </section>
  );
}

function LearningPaths({
  paths,
  courses,
  enrollments,
  onCreatePath,
  onConfigurePath,
}: {
  paths: LearningRecord[];
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  onCreatePath: () => void;
  onConfigurePath: (path: LearningRecord) => void;
}) {
  const pathColors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];

  if (!paths.length) {
    return (
      <EmptyState
        icon={AdjustmentsHorizontalIcon}
        title="Build your first learning path"
        description="Create an ordered journey from the courses in your catalog. You can return at any time to change the sequence."
        action="Create path"
        onAction={onCreatePath}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Purposeful course journeys</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-zinc-400">Each path follows the course order you configure. Reopen a path to add, remove, or reorder courses.</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={onCreatePath} className="h-9 shrink-0 bg-white dark:bg-zinc-900">
            <PlusIcon className="mr-2 h-4 w-4" />New path
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {paths.map((path, pathIndex) => {
          const courseIds = stringArrayValue(recordValue(path, 'courseIds', 'course_ids'));
          const courseById = new Map(courses.map(course => [course.id, course]));
          const steps = courseIds
            .map(courseId => courseById.get(courseId))
            .filter((course): course is LearningRecord => Boolean(course));
          const stepIds = new Set(courseIds);
          const relevantEnrollments = enrollments.filter(item => stepIds.has(String(recordValue(item, 'courseId', 'course_id'))));
          const progress = relevantEnrollments.length
            ? Math.round(relevantEnrollments.reduce((sum, item) => sum + numberValue(item.progress), 0) / relevantEnrollments.length)
            : 0;
          const duration = steps.reduce((sum, course) => sum + numberValue(recordValue(course, 'durationHours', 'duration_hours')), 0);

          return (
            <article key={path.id} className="group flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(30,48,87,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(30,95,75,0.13)] dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="relative flex h-24 items-start justify-between overflow-hidden bg-[#edf4ee] px-5 py-4 text-[#355c4b] dark:bg-[#24362f] dark:text-emerald-200">
                <MapPinIcon className={cn('relative z-10 h-9 w-9 fill-white stroke-[1.5] transition-transform duration-300 group-hover:-translate-y-1', pathIndex % 2 ? 'text-[#e58b51]' : 'text-[#4f83d1]')} />
                <span className="relative z-10 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold dark:bg-zinc-900/70">{steps.length} course{steps.length === 1 ? '' : 's'} · {duration}h</span>
                <span className="absolute -bottom-12 -left-6 h-24 w-52 rotate-3 rounded-[50%] bg-[#a9c79c]" aria-hidden="true" />
                <span className="absolute -bottom-14 left-[34%] h-24 w-60 -rotate-2 rounded-[50%] bg-[#739b78]" aria-hidden="true" />
                <span className="absolute bottom-0 left-[48%] h-10 w-2 rotate-[22deg] rounded-full bg-[#f3e1bc]" aria-hidden="true" />
              </div>
              <div className="border-b border-slate-100 p-5 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">{text(path.title, 'Untitled path')}</h2>
                  <StatusPill status={path.status} />
                </div>
                <p className="mt-1.5 min-h-10 text-sm leading-5 text-slate-500 dark:text-zinc-400">{text(path.description, 'A focused sequence of learning courses.')}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{progress}%</span>
                </div>
              </div>
              <ol className="flex-1 divide-y divide-slate-100 px-5 dark:divide-zinc-800">
                {steps.length ? steps.map((course, index) => (
                  <li key={course.id} className="flex items-start gap-3 py-4">
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white shadow-sm', pathColors[pathIndex % pathColors.length])}>{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{text(course.title, 'Untitled course')}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{text(recordValue(course, 'durationHours', 'duration_hours'), '0')} hours · {text(course.category, 'General')}</p>
                    </div>
                  </li>
                )) : (
                  <li className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">The configured courses are no longer available.</li>
                )}
              </ol>
              <div className="border-t border-slate-100 p-4 dark:border-zinc-800">
                <Button type="button" variant="outline" className="w-full" onClick={() => onConfigurePath(path)}>
                  <PencilSquareIcon className="mr-2 h-4 w-4" />
                  Configure courses
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function AchievementJourney({
  courses,
  enrollments,
  certificates,
}: {
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  certificates: LearningRecord[];
}) {
  const completed = enrollments.filter(record => normalizeStatus(record.status) === 'completed').length;
  const progressAverage = enrollments.length
    ? Math.round(enrollments.reduce((total, record) => total + numberValue(record.progress), 0) / enrollments.length)
    : 0;
  const requiredCourses = courses.filter(course => booleanValue(course.isRequired, course.is_required)).length;
  const activeCourses = courses.filter(isCourseActive).length;
  const achievements = [
    { title: 'First step', description: 'Complete your first learning assignment.', value: completed, target: 1, icon: AcademicCapIcon },
    { title: 'Learning rhythm', description: 'Complete five learning assignments.', value: completed, target: 5, icon: BookOpenIcon },
    { title: 'High momentum', description: 'Reach 90% average learning progress.', value: progressAverage, target: 90, suffix: '%', icon: ChartBarIcon },
    { title: 'Compliance guardian', description: 'Build three required courses.', value: requiredCourses, target: 3, icon: ShieldCheckIcon },
    { title: 'Academy builder', description: 'Maintain ten active courses.', value: activeCourses, target: 10, icon: TrophyIcon },
    { title: 'Verified expert', description: 'Record three active certificates.', value: certificates.filter(item => normalizeStatus(item.status) === 'active').length, target: 3, icon: CheckBadgeIcon },
  ];
  const unlocked = achievements.filter(item => item.value >= item.target).length;

  return (
    <div className="space-y-6">
      <section className="relative grid gap-5 overflow-hidden rounded-2xl border border-amber-200 bg-[#fff8e8] p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 sm:grid-cols-[1fr_auto] sm:items-end">
        <TrophyIcon className="absolute -right-5 -top-8 h-40 w-40 rotate-12 text-amber-300/25 dark:text-amber-500/10" aria-hidden="true" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Team collection</p>
          <h2 className="mt-3 text-2xl font-bold">{unlocked} of {achievements.length} milestones unlocked</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-zinc-400">Achievements reflect real activity in the catalog, enrollments, and certificate register.</p>
        </div>
        <div className="flex gap-1.5" aria-label={`${unlocked} of ${achievements.length} achievements unlocked`}>
          {achievements.map((item, index) => <span key={item.title} className={cn('h-2 w-8 rounded-full', index < unlocked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-700')} />)}
        </div>
      </section>

      <section className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {achievements.map((achievement, index) => {
          const unlockedItem = achievement.value >= achievement.target;
          const progress = Math.min(100, Math.round((achievement.value / achievement.target) * 100));
          const Icon = achievement.icon;
          return (
            <article key={achievement.title} className={cn(
              'group relative overflow-hidden rounded-2xl border p-5 shadow-[0_8px_24px_rgba(30,48,87,0.06)] transition-all duration-300 ease-out hover:-translate-y-1',
              unlockedItem
                ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30'
                : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50',
            )}>
              <span className="absolute right-4 top-4 text-xs font-bold text-slate-300 dark:text-zinc-700">{String(index + 1).padStart(2, '0')}</span>
              <div className={cn(
                'grid h-12 w-12 place-items-center rounded-[8px] border',
                unlockedItem
                  ? 'border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500',
              )}>
                {unlockedItem ? <Icon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" /> : <LockClosedIcon className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6" />}
              </div>
              <h2 className="mt-5 text-base font-semibold">{achievement.title}</h2>
              <p className="mt-1.5 min-h-10 text-sm leading-5 text-slate-500 dark:text-zinc-400">{achievement.description}</p>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className={cn('font-semibold', unlockedItem ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-zinc-400')}>{unlockedItem ? 'Unlocked' : 'In progress'}</span>
                  <span className="text-slate-500 dark:text-zinc-400">{achievement.value}{achievement.suffix || ''} / {achievement.target}{achievement.suffix || ''}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                  <div className={cn('h-full rounded-full', unlockedItem ? 'bg-indigo-600' : 'bg-slate-400 dark:bg-zinc-500')} style={{ width: `${progress}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function CertificateRegister({
  certificates,
  mode,
  isSaving,
  onAdd,
  onVerify,
}: {
  certificates: LearningRecord[];
  mode: 'employee' | 'trusted';
  isSaving: boolean;
  onAdd: () => void;
  onVerify: (certificateId: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const visibleCertificates = certificates.filter(item => (
    mode === 'trusted' ? isTrustedCertificate(item) : !isTrustedCertificate(item)
  ));
  const filtered = visibleCertificates.filter(item => {
    const matchesQuery = `${text(item.name, '')} ${text(item.issuer, '')} ${text(recordValue(item, 'employeeId', 'employee_id'), '')}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'all' || normalizeStatus(item.status) === status);
  });
  const sortResolvers = React.useMemo<SortValueResolverMap<LearningRecord>>(() => ({
    credential: item => text(item.name, ''),
    identity: item => mode === 'trusted'
      ? (recordValue(item, 'validityMonths', 'validity_months')
        ? text(recordValue(item, 'validityMonths', 'validity_months'), '0')
        : text(item.issuer, ''))
      : text(recordValue(item, 'employeeId', 'employee_id'), ''),
    siteOrIssued: item => mode === 'trusted'
      ? text(recordValue(item, 'verificationUrl', 'verification_url'), '')
      : text(recordValue(item, 'issuedAt', 'issued_at'), ''),
    approveOrExpires: item => mode === 'trusted'
      ? text(recordValue(item, 'verifiedAt', 'verified_at'), '')
      : text(recordValue(item, 'expiresAt', 'expires_at'), ''),
    status: item => text(item.status, ''),
    hrVerification: item => text(recordValue(item, 'verificationStatus', 'verification_status'), ''),
  }), [mode]);
  const sorted = React.useMemo(
    () => sortRowsByColumn(filtered, sortColumn, sortDirection, sortResolvers),
    [filtered, sortColumn, sortDirection, sortResolvers],
  );
  const handleSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };
  const active = visibleCertificates.filter(item => normalizeStatus(item.status) === 'active').length;
  const expiring = mode === 'employee' ? visibleCertificates.filter(item => {
    const days = daysUntil(recordValue(item, 'expiresAt', 'expires_at'));
    return days !== null && days >= 0 && days <= 60;
  }).length : 0;

  return (
    <div className="space-y-5">
      <section className="grid overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_8px_24px_rgba(74,62,119,0.07)] dark:border-violet-900/40 dark:bg-zinc-900/50 sm:grid-cols-3">
        <InlineMetric label={mode === 'trusted' ? 'Trusted certificates' : 'Employee certificates'} value={visibleCertificates.length} icon={mode === 'trusted' ? ShieldCheckIcon : CheckBadgeIcon} />
        <InlineMetric label={mode === 'trusted' ? 'Active' : 'Awaiting HR verification'} value={mode === 'trusted' ? active : visibleCertificates.filter(item => normalizeStatus(recordValue(item, 'verificationStatus', 'verification_status')) === 'pending').length} icon={mode === 'trusted' ? CheckCircleIcon : ClockIcon} border />
        <InlineMetric label={mode === 'trusted' ? 'With validity policy' : 'Expiring soon'} value={mode === 'trusted' ? visibleCertificates.filter(item => Boolean(recordValue(item, 'validityMonths', 'validity_months'))).length : expiring} icon={CalendarDaysIcon} border />
      </section>
      <section className="rounded-[8px] border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-indigo-200">
        {mode === 'trusted'
          ? 'This catalog defines qualification types and recognized issuers. Dates belong to each employee certificate, not to this catalog.'
          : 'Employee certificates stay here after HR verification. Issue and expiry dates apply to the individual employee record.'}
      </section>
      <section className="flex flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search certificates</span>
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={mode === 'trusted' ? 'Search credential or issuer' : 'Search credential, issuer, or employee ID'}
            className="h-10 bg-slate-50 pl-9 dark:bg-zinc-900"
          />
        </label>
        <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="archived">Archived</option>
        </select>
      </section>

      {filtered.length ? (
        <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <SortableNativeHeader
                    column="credential"
                    label="Credential"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="identity"
                    label={mode === 'trusted' ? 'Validity policy' : 'Employee'}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="siteOrIssued"
                    label={mode === 'trusted' ? 'Verification site' : 'Issued'}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="approveOrExpires"
                    label={mode === 'trusted' ? 'Approved' : 'Expires'}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="status"
                    label="Status"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="hrVerification"
                    label="HR verification"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {sorted.map(certificate => {
                  const expiresAt = recordValue(certificate, 'expiresAt', 'expires_at');
                  const days = daysUntil(expiresAt);
                  const verificationStatus = recordValue(certificate, 'verificationStatus', 'verification_status') || 'pending';
                  return (
                    <tr key={certificate.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"><CheckBadgeIcon className="h-5 w-5" /></div>
                          <div>
                            <p className="font-semibold">{text(certificate.name, 'Untitled certificate')}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{text(certificate.issuer, 'Issuer not recorded')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-zinc-300">
                        {mode === 'trusted'
                          ? (recordValue(certificate, 'validityMonths', 'validity_months') ? `${text(recordValue(certificate, 'validityMonths', 'validity_months'))} months` : 'Does not expire / varies')
                          : text(recordValue(certificate, 'employeeId', 'employee_id'))}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-zinc-400">
                        {mode === 'trusted'
                          ? (recordValue(certificate, 'verificationUrl', 'verification_url') ? <a className="font-medium text-indigo-700 hover:underline dark:text-indigo-300" href={String(recordValue(certificate, 'verificationUrl', 'verification_url'))} target="_blank" rel="noreferrer">Open site</a> : 'Not recorded')
                          : formatDate(recordValue(certificate, 'issuedAt', 'issued_at'))}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600 dark:text-zinc-300">{mode === 'trusted' ? formatDate(recordValue(certificate, 'verifiedAt', 'verified_at')) : formatDate(expiresAt)}</p>
                        {mode === 'employee' && days !== null && days >= 0 && days <= 60 && <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{days} days remaining</p>}
                      </td>
                      <td className="px-5 py-4"><StatusPill status={certificate.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <StatusPill status={verificationStatus} />
                            {verificationStatus === 'verified' && (
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                                Verified by HR · {formatDate(recordValue(certificate, 'verifiedAt', 'verified_at'))}
                              </p>
                            )}
                          </div>
                          {mode === 'employee' && verificationStatus !== 'verified' && normalizeStatus(certificate.status) !== 'archived' && (
                            <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={() => onVerify(certificate.id)}>
                              <ShieldCheckIcon className="mr-2 h-4 w-4" />
                              Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : visibleCertificates.length ? (
        <EmptyInline title="No credentials match" description="Try another search or status filter." />
      ) : (
        <EmptyState
          icon={mode === 'trusted' ? ShieldCheckIcon : CheckBadgeIcon}
          title={mode === 'trusted' ? 'Create the trusted certificate register' : 'No employee certificates awaiting review'}
          description={mode === 'trusted'
            ? 'Register a recognized qualification type, its issuer, and optional standard validity policy.'
            : 'Add an employee credential here, then verify it after HR reviews the evidence.'}
          action={mode === 'trusted' ? 'Register trusted certificate' : 'Add employee certificate'}
          onAction={onAdd}
        />
      )}
    </div>
  );
}

function OnboardingWorkspace({
  cases,
  templates,
  tasks,
  metrics,
}: {
  cases: LearningRecord[];
  templates: LearningRecord[];
  tasks: LearningRecord[];
  metrics: Array<{ label: string; value: string | number; helper?: string }>;
}) {
  const [tab, setTab] = React.useState<'people' | 'templates' | 'tasks'>('people');
  const average = cases.length ? Math.round(cases.reduce((sum, item) => sum + numberValue(item.progress), 0) / cases.length) : 0;
  const overdue = cases.filter(item => {
    const days = daysUntil(recordValue(item, 'targetDate', 'target_date'));
    return days !== null && days < 0 && normalizeStatus(item.status) !== 'completed';
  }).length;

  return (
    <div className="space-y-9">
      <section aria-label="Onboarding summary" className="grid border-y border-slate-200 dark:border-zinc-800 sm:grid-cols-3">
        {[
          { label: 'Active journeys', value: cases.filter(item => normalizeStatus(item.status) !== 'completed' && normalizeStatus(item.status) !== 'archived').length, icon: UserGroupIcon, tone: 'text-[#4f83d1]' },
          { label: 'Average progress', value: `${average}%`, icon: ChartBarIcon, tone: 'text-[#3f9d77]' },
          { label: 'Need attention', value: overdue, icon: CalendarDaysIcon, tone: 'text-[#df8351]' },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={cn('flex items-center gap-4 py-5 sm:px-6', index > 0 && 'border-t border-slate-200 dark:border-zinc-800 sm:border-l sm:border-t-0')}>
              <Icon className={cn('h-6 w-6 shrink-0 stroke-[1.6]', metric.tone)} />
              <div>
                <p className="text-2xl font-bold tracking-[-0.03em] text-[#172033] dark:text-zinc-50">{metric.value}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex gap-7 overflow-x-auto border-b border-slate-200 dark:border-zinc-800">
        {([
          ['people', 'New hires', cases.length],
          ['templates', 'Templates', templates.length],
          ['tasks', 'Task library', tasks.length],
        ] as const).map(([value, label, count]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={cn('relative shrink-0 pb-3 text-sm font-semibold transition-colors', tab === value ? 'text-[#316be8] dark:text-blue-300' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100')}>
            {label} <span className="ml-1 text-xs opacity-55">{count}</span>
            {tab === value && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#316be8]" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {tab === 'people' ? (
        cases.length ? (
          <section className="relative ml-3 border-l border-dashed border-[#9fb2c5] dark:border-zinc-700">
            {cases.map(item => {
              const progress = Math.min(100, Math.max(0, numberValue(item.progress)));
              const targetDate = recordValue(item, 'targetDate', 'target_date');
              return (
                <article key={item.id} className="group relative grid gap-5 border-b border-slate-200 py-6 pl-9 last:border-b-0 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)] lg:items-center">
                  <span className="absolute -left-[7px] top-8 h-3.5 w-3.5 rounded-full border-[3px] border-[#f6f8fc] bg-[#4f83d1] transition-transform duration-200 group-hover:scale-125 dark:border-zinc-950" aria-hidden="true" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 text-sm font-bold text-[#4f83d1] dark:border-zinc-700 dark:text-blue-300">
                        {text(recordValue(item, 'employeeId', 'employee_id'), 'NH').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{text(item.title || recordValue(item, 'employeeId', 'employee_id'), 'New hire')}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">Started {formatDate(recordValue(item, 'startDate', 'start_date'))}</p>
                      </div>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400"><span>Journey progress</span><span>{progress}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700"><div className="h-full rounded-full bg-[#4f83d1]" style={{ width: `${progress}%` }} /></div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4" />Target {formatDate(targetDate)}</span>
                      <span>{tasks.length} tasks available</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : <OnboardingOpenEmpty icon={MapPinIcon} title="Base Camp is ready" description="Start an onboarding journey to place the first new hire on the trail." />
      ) : tab === 'templates' ? (
        templates.length ? (
          <section className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
            {templates.map(item => (
              <article key={item.id} className="grid gap-4 py-5 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-[#4f83d1] dark:text-blue-300" />
                <div>
                  <h2 className="text-base font-semibold">{text(item.name, 'Untitled template')}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-zinc-400">{text(item.description, 'A reusable onboarding journey for new employees.')}</p>
                </div>
                <div className="justify-self-start sm:justify-self-end">
                  <StatusPill status={booleanValue(item.isActive, item.is_active) ? 'active' : 'archived'} />
                </div>
              </article>
            ))}
          </section>
        ) : <OnboardingOpenEmpty icon={ClipboardDocumentCheckIcon} title="No routes saved yet" description="Templates turn a great first week into a repeatable journey." />
      ) : (
        tasks.length ? (
          <section className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
            {tasks.map((item, index) => (
              <article key={item.id} className="grid gap-3 py-5 sm:grid-cols-[32px_minmax(0,1fr)_120px_90px] sm:items-center">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e9f0fb] text-[10px] font-bold text-[#4f83d1] dark:bg-blue-950/50 dark:text-blue-300">{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{text(item.title, 'Untitled task')}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{text(item.description, 'No description')}</p>
                </div>
                <p className="text-xs font-semibold capitalize text-slate-500 dark:text-zinc-400">{text(recordValue(item, 'ownerRole', 'owner_role'), 'HR')}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Day {text(recordValue(item, 'dueDay', 'due_day'), '0')}</p>
              </article>
            ))}
          </section>
        ) : <OnboardingOpenEmpty icon={ClipboardDocumentCheckIcon} title="The task trail is open" description="Add practical steps for HR, managers, IT, and each new employee." />
      )}
      {metrics[0]?.helper && <p className="text-right text-[11px] text-slate-400 dark:text-zinc-600">{metrics[0].helper}</p>}
    </div>
  );
}

function OnboardingOpenEmpty({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="relative min-h-48 py-10 pl-14">
      <span className="absolute bottom-0 left-4 top-0 border-l border-dashed border-[#9fb2c5] dark:border-zinc-700" aria-hidden="true" />
      <span className="absolute left-[9px] top-11 grid h-4 w-4 place-items-center rounded-full bg-[#4f83d1] ring-4 ring-[#f6f8fc] dark:ring-zinc-950" aria-hidden="true" />
      <Icon className="h-7 w-7 text-[#4f83d1] dark:text-blue-300" />
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[#172033] dark:text-zinc-50">{title}</h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function CourseStrip({ courses }: { courses: LearningRecord[] }) {
  if (!courses.length) return <EmptyInline title="Your catalog is ready for its first course" description="Create a course to start building learning paths and assignments." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {courses.map(course => (
        <Link key={course.id} href="/learning/courses" className="group flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
          <span className={cn('h-10 w-2 shrink-0', courseColor(course.category))} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{text(course.title, 'Untitled course')}</span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">{text(course.category, 'General')} · {text(recordValue(course, 'durationHours', 'duration_hours'), '0')}h</span>
          </span>
          <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );
}

function InlineMetric({ label, value, icon: Icon, border = false }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; border?: boolean }) {
  return (
    <div className={cn('flex items-center gap-4 px-5 py-5', border && 'border-t border-slate-200 dark:border-zinc-800 sm:border-l sm:border-t-0')}>
      <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-bold text-[#272f8f] dark:text-indigo-300">{value}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: unknown }) {
  return <HrisStatusBadge value={status || 'active'} />;
}

function LoadingSurface() {
  return (
    <section className="space-y-5" aria-label="Loading learning data">
      <div className="grid animate-pulse overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 border-slate-200 sm:border-l dark:border-zinc-800" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" />)}
      </div>
    </section>
  );
}

function EmptyInline({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-5 py-10 text-center dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white px-6 py-16 text-center shadow-[0_12px_36px_rgba(49,107,232,0.08)] dark:border-indigo-900/50 dark:bg-zinc-900/50">
      <span className="absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 rounded-full bg-indigo-100/60 blur-2xl dark:bg-indigo-800/20" aria-hidden="true" />
      <div className="relative">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"><Icon className="h-8 w-8 stroke-[1.6]" /></div>
        <h2 className="mt-5 text-lg font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-zinc-400">{description}</p>
        <Button type="button" onClick={onAction} className="mt-6 h-11 rounded-full bg-[#316be8] px-5 hover:bg-[#285dce]">
          <PlusIcon className="mr-2 h-4 w-4" />{action}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CourseDialog({
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CourseForm;
  setForm: React.Dispatch<React.SetStateAction<CourseForm>>;
  categories: LearningCourseCategory[];
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a course</DialogTitle>
          <DialogDescription>Add a focused learning experience to the employee catalog.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Course title">
            <Input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Security awareness essentials" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <Field label="Category">
              <CourseCategoryPicker value={form.category} categories={categories} onChange={category => setForm(current => ({ ...current, category }))} disabled={isSaving} />
            </Field>
            <Field label="Duration (hours)">
              <Input type="number" min="0" step="0.5" value={form.durationHours} onChange={event => setForm(current => ({ ...current, durationHours: event.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="What employees will know or be able to do after this course" className="min-h-24" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Required learning">
              <select value={form.isRequired} onChange={event => setForm(current => ({ ...current, isRequired: event.target.value }))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <option value="false">Optional</option><option value="true">Required</option>
              </select>
            </Field>
            <Field label="Catalog status">
              <select value={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.value }))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <option value="true">Active</option><option value="false">Inactive</option>
              </select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>{isSaving ? 'Creating…' : 'Create course'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseCategoryPicker({ value, categories, onChange, disabled }: { value: string; categories: LearningCourseCategory[]; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const selected = categories.find(category => getLearningCourseCategoryPath(category.id, categories) === value);

  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(current => !current)} className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" aria-haspopup="tree" aria-expanded={open}>
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>{selected ? getLearningCourseCategoryPath(selected.id, categories) : value || 'Select a category'}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && <>
        <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close category selector" onClick={() => setOpen(false)} />
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900" role="tree" aria-label="Course categories">
          {getLearningCourseCategoryChildren(null, categories).map(category => <CourseCategoryTreeNode key={category.id} category={category} categories={categories} value={value} onSelect={categoryId => { onChange(getLearningCourseCategoryPath(categoryId, categories)); setOpen(false); }} />)}
          {getLearningCourseCategoryChildren(null, categories).length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No active course categories are configured.</p>}
        </div>
      </>}
    </div>
  );
}

function CourseCategoryTreeNode({ category, categories, value, onSelect }: { category: LearningCourseCategory; categories: LearningCourseCategory[]; value: string; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const children = getLearningCourseCategoryChildren(category.id, categories);
  const categoryPath = getLearningCourseCategoryPath(category.id, categories);
  return <div role="treeitem" aria-selected={value === categoryPath}><div className={cn('flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800', value === categoryPath && 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200')}><button type="button" className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground" onClick={() => children.length && setExpanded(current => !current)} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.name}`}>{children.length ? (expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />) : <span className="h-1 w-1 rounded-full bg-current opacity-40" />}</button><button type="button" className="min-w-0 flex-1 truncate px-1 py-1 text-left text-xs font-medium" onClick={() => onSelect(category.id)}>{category.name}</button></div>{expanded && children.length > 0 && <div className="ml-5 border-l border-slate-200 pl-1 dark:border-zinc-700">{children.map(child => <CourseCategoryTreeNode key={child.id} category={child} categories={categories} value={value} onSelect={onSelect} />)}</div>}</div>;
}

function CertificateDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  trusted,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CertificateForm;
  setForm: React.Dispatch<React.SetStateAction<CertificateForm>>;
  isSaving: boolean;
  trusted: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{trusted ? 'Register a trusted certificate' : 'Add an employee certificate'}</DialogTitle>
          <DialogDescription>
            {trusted
              ? 'Register a qualification type and recognized issuing organization. Employee dates are recorded separately.'
              : 'Record an employee credential for HR review and verification.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className={cn('grid gap-4', !trusted && 'sm:grid-cols-2')}>
            {!trusted && (
              <Field label="Employee">
                <HrEmployeeSearchSelect value={form.employeeId} onValueChange={employeeId => setForm(current => ({ ...current, employeeId }))} disabled={isSaving} />
              </Field>
            )}
            <Field label="Status">
              <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <option value="active">Active</option><option value="expired">Expired</option><option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <Field label="Certificate name">
            <Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Certified People Manager" />
          </Field>
          <Field label="Issuer">
            <Input value={form.issuer} onChange={event => setForm(current => ({ ...current, issuer: event.target.value }))} placeholder="Issuing organization" />
          </Field>
          {trusted ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Standard validity (months, optional)">
                <Input type="number" min="1" value={form.validityMonths} onChange={event => setForm(current => ({ ...current, validityMonths: event.target.value }))} placeholder="For example, 24" />
              </Field>
              <Field label="Verification website (optional)">
                <Input type="url" value={form.verificationUrl} onChange={event => setForm(current => ({ ...current, verificationUrl: event.target.value }))} placeholder="https://issuer.example/verify" />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Issued date"><Input type="date" value={form.issuedAt} onChange={event => setForm(current => ({ ...current, issuedAt: event.target.value }))} /></Field>
              <Field label="Expiry date"><Input type="date" value={form.expiresAt} onChange={event => setForm(current => ({ ...current, expiresAt: event.target.value }))} /></Field>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : trusted ? 'Register trusted certificate' : 'Add employee certificate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnboardingDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: OnboardingForm;
  setForm: React.Dispatch<React.SetStateAction<OnboardingForm>>;
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Start employee onboarding</DialogTitle>
          <DialogDescription>Create a learning and onboarding journey for a new employee.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Employee">
            <HrEmployeeSearchSelect value={form.employeeId} onValueChange={employeeId => setForm(current => ({ ...current, employeeId }))} disabled={isSaving} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))}
              />
            </Field>
            <Field label="Target date">
              <Input
                type="date"
                value={form.targetDate}
                onChange={event => setForm(current => ({ ...current, targetDate: event.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={form.status}
                onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Initial progress">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={event => setForm(current => ({ ...current, progress: event.target.value }))}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? 'Starting…' : 'Start onboarding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LearningPathDialog({
  open,
  onOpenChange,
  form,
  setForm,
  courses,
  isSaving,
  isEditing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: LearningPathForm;
  setForm: React.Dispatch<React.SetStateAction<LearningPathForm>>;
  courses: LearningRecord[];
  isSaving: boolean;
  isEditing: boolean;
  onSubmit: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const filteredCourses = courses.filter(course => (
    `${text(course.title, '')} ${text(course.category, '')}`.toLowerCase().includes(query.toLowerCase())
  ));
  const courseById = new Map(courses.map(course => [course.id, course]));

  const toggleCourse = (courseId: string) => {
    setForm(current => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter(id => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const moveCourse = (index: number, direction: -1 | 1) => {
    setForm(current => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.courseIds.length) return current;
      const courseIds = [...current.courseIds];
      [courseIds[index], courseIds[nextIndex]] = [courseIds[nextIndex], courseIds[index]];
      return { ...current, courseIds };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[780px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Configure learning path' : 'Create a learning path'}</DialogTitle>
          <DialogDescription>Choose the courses employees should complete, then arrange them in the intended order.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <Field label="Path title">
              <Input
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                placeholder="New manager foundation"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              placeholder="What employees will be ready to do after completing this path"
              className="min-h-20"
            />
          </Field>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-[8px] border border-slate-200 dark:border-zinc-700">
              <div className="border-b border-slate-200 p-3 dark:border-zinc-700">
                <p className="text-sm font-semibold">Course catalog</p>
                <label className="relative mt-3 block">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <span className="sr-only">Search courses</span>
                  <Input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search courses"
                    className="h-9 pl-9"
                  />
                </label>
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-zinc-800">
                {filteredCourses.length ? filteredCourses.map(course => {
                  const checked = form.courseIds.includes(course.id);
                  return (
                    <label key={course.id} className="flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/70">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCourse(course.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{text(course.title, 'Untitled course')}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-400">
                          {text(course.category, 'General')} · {text(recordValue(course, 'durationHours', 'duration_hours'), '0')}h
                        </span>
                      </span>
                    </label>
                  );
                }) : (
                  <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                    {courses.length ? 'No courses match your search.' : 'Create a course before building a path.'}
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[8px] border border-slate-200 dark:border-zinc-700">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-zinc-700">
                <p className="text-sm font-semibold">Path order</p>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{form.courseIds.length} selected</span>
              </div>
              <ol className="max-h-[316px] divide-y divide-slate-100 overflow-y-auto dark:divide-zinc-800">
                {form.courseIds.length ? form.courseIds.map((courseId, index) => {
                  const course = courseById.get(courseId);
                  if (!course) return null;
                  return (
                    <li key={courseId} className="flex items-center gap-2 px-3 py-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{text(course.title, 'Untitled course')}</span>
                      <div className="flex shrink-0">
                        <Button type="button" variant="ghost" className="h-7 w-7 p-0" disabled={index === 0} onClick={() => moveCourse(index, -1)} aria-label={`Move ${text(course.title, 'course')} earlier`}>
                          <ChevronUpIcon className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" className="h-7 w-7 p-0" disabled={index === form.courseIds.length - 1} onClick={() => moveCourse(index, 1)} aria-label={`Move ${text(course.title, 'course')} later`}>
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                }) : (
                  <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">Select at least one course from the catalog.</li>
                )}
              </ol>
            </section>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving || !form.title.trim() || !form.courseIds.length}>
            {isSaving ? 'Saving…' : isEditing ? 'Save path' : 'Create path'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
