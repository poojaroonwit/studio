"use client";

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Send, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type PublicApplyBranding = {
  appName: string;
  organizationName: string;
  appLogoDataUrl: string | null;
};

type PublicApplyPosition = {
  id: string;
  title: string;
  department: string;
  description: string | null;
  positionLevel: string | null;
  publicApplyPath: string;
};

type PublicApplyData = {
  branding: PublicApplyBranding;
  positions: PublicApplyPosition[];
  enabled?: boolean;
  selectedPositionId?: string | null;
  captcha?: {
    question: string;
    token: string;
  } | null;
  message?: string;
};

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

function getInitialPositionId() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('positionId') || params.get('position') || '';
}

function getShortDescription(description: string | null) {
  if (!description) return 'Share your resume with the hiring team for this opening.';
  return description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function PublicApplyPage({ slug }: { slug?: string }) {
  const [data, setData] = useState<PublicApplyData | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const params = new URLSearchParams();
        if (slug) params.set('slug', slug);
        const initialPositionId = getInitialPositionId();
        if (initialPositionId) params.set('positionId', initialPositionId);
        const queryString = params.toString();
        const response = await fetch(`/api/public/apply${queryString ? `?${queryString}` : ''}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load open roles');
        const nextData = await response.json() as PublicApplyData;
        if (!isMounted) return;

        setData(nextData);
        if (nextData.enabled === false) {
          setMessage(nextData.message || 'Public applications are currently closed.');
          setSubmitState('error');
          return;
        }
        const firstPositionId = nextData.positions[0]?.id || '';
        setSelectedPositionId(
          nextData.selectedPositionId
            || (nextData.positions.some(position => position.id === initialPositionId)
              ? initialPositionId
              : firstPositionId)
        );
      } catch (error) {
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : 'Unable to load application page');
        setSubmitState('error');
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  async function refreshCaptcha() {
    try {
      const response = await fetch('/api/public/apply', { cache: 'no-store' });
      if (!response.ok) return;
      const nextData = await response.json() as PublicApplyData;
      setData((currentData) => currentData
        ? { ...currentData, captcha: nextData.captcha || null }
        : nextData);
    } catch {
      // The next submit attempt will show validation if captcha refresh failed.
    }
  }

  const selectedPosition = useMemo(() => (
    data?.positions.find(position => position.id === selectedPositionId) || null
  ), [data?.positions, selectedPositionId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('submitting');
    setMessage('');

    try {
      const formData = new FormData(event.currentTarget);
      formData.set('positionId', selectedPositionId);
      formData.set('source', 'public_apply');

      const response = await fetch('/api/public/apply', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.message === 'string' ? result.message : 'Application submit failed');
      }

      event.currentTarget.reset();
      setResumeName('');
      setSubmitState('success');
      setMessage('Your application has been received.');
      void refreshCaptcha();
    } catch (error) {
      setSubmitState('error');
      setMessage(error instanceof Error ? error.message : 'Application submit failed');
      void refreshCaptcha();
    }
  }

  const branding = data?.branding;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.012_92)] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-10">
        <section className="flex flex-col justify-between gap-10 border-b border-slate-200 pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-8 dark:border-slate-800">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              {branding?.appLogoDataUrl ? (
                <img src={branding.appLogoDataUrl} alt="" className="h-11 w-11 rounded-md object-contain" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-900 text-white">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{branding?.organizationName || 'Hiring Team'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{branding?.appName || 'FitScan'}</p>
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">
                Careers
              </p>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
                Share your resume with the hiring team.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">
                Choose the role you are interested in, attach your resume, and the recruiting team will review your profile.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
              PDF and DOCX resumes are accepted.
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
              Your submission goes directly into the applicant review queue.
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Full name</span>
                <Input name="name" required placeholder="Jane Candidate" className="h-11 bg-white dark:bg-slate-900" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Email</span>
                <Input name="email" type="email" required placeholder="jane@example.com" className="h-11 bg-white dark:bg-slate-900" />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Phone</span>
              <Input name="phone" placeholder="+1 555 0100" className="h-11 bg-white dark:bg-slate-900" />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Position</span>
              <select
                name="positionId"
                required
                value={selectedPositionId}
                onChange={(event) => setSelectedPositionId(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-slate-900"
              >
                {data?.positions.length ? data.positions.map(position => (
                  <option key={position.id} value={position.id}>
                    {position.title} · {position.department}
                  </option>
                )) : (
                  <option value="">No open positions</option>
                )}
              </select>
            </label>

            {selectedPosition && (
              <div className="border-l-2 border-emerald-800 pl-4 text-sm text-slate-600 dark:border-emerald-300 dark:text-slate-300">
                <p className="font-medium text-slate-950 dark:text-slate-50">{selectedPosition.title}</p>
                <p>{selectedPosition.department}{selectedPosition.positionLevel ? ` · ${selectedPosition.positionLevel}` : ''}</p>
                <p className="mt-2 leading-6">{getShortDescription(selectedPosition.description)}</p>
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-sm font-medium">Resume</span>
              <div className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-300">
                <UploadCloud className="h-7 w-7 text-emerald-800 dark:text-emerald-300" />
                <span className="text-sm font-medium">{resumeName || 'Choose a resume file'}</span>
                <span className="text-xs text-slate-500">PDF or DOCX up to 25MB</span>
                <input
                  name="resume"
                  type="file"
                  required
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(event) => setResumeName(event.target.files?.[0]?.name || '')}
                />
              </div>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Note</span>
              <Textarea name="note" placeholder="Optional context for the hiring team" className="min-h-24 bg-white dark:bg-slate-900" />
            </label>

            <label className="sr-only" aria-hidden="true">
              Company website
              <Input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            {data?.captcha && (
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <input type="hidden" name="captchaToken" value={data.captcha.token} />
                <label className="space-y-2">
                  <span className="text-sm font-medium">Verification</span>
                  <p className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900">
                    What is {data.captcha.question}?
                  </p>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Answer</span>
                  <Input name="captchaAnswer" required inputMode="numeric" className="h-11 bg-white dark:bg-slate-900" />
                </label>
              </div>
            )}

            <Button type="submit" size="lg" disabled={submitState === 'submitting' || !data?.positions.length || data?.enabled === false} className="h-11 w-full">
              {submitState === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending application
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit application
                </>
              )}
            </Button>

            {message && (
              <p className={submitState === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-700 dark:text-emerald-300'}>
                {message}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
