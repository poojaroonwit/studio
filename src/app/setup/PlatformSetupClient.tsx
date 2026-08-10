"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAiAvailableModels, saveAiApiKeys } from '@/components/settings/ai-api-keys-api';
import {
  getProviderDefaultModel,
  type AiProvider,
} from '@/components/settings/ai-api-keys-utils';
import { getJsonErrorMessage, readJsonObject } from '@/lib/response-json';

type SetupStage = 'account' | 'ai' | 'tour' | 'complete';

type TourStep = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  points: string[];
};

const tourSteps: TourStep[] = [
  {
    eyebrow: 'Your first activation step',
    title: 'Shape the hiring workflow',
    description: 'After account creation, start with the company profile and the hiring defaults your team will use every day.',
    icon: Workflow,
    points: ['Confirm the company profile', 'Review recruitment stages and sources', 'Set position levels and grades'],
  },
  {
    eyebrow: 'Your second activation step',
    title: 'Prepare people operations',
    description: 'Build the minimum workforce structure before inviting the wider team into the workspace.',
    icon: UsersRound,
    points: ['Create departments and employee records', 'Configure attendance and leave', 'Review roles before inviting teammates'],
  },
  {
    eyebrow: 'Your final activation step',
    title: 'Open the first hiring flow',
    description: 'The dashboard will keep one activation checklist visible until the required workspace tasks are complete.',
    icon: Sparkles,
    points: ['Create or review an open position', 'Invite the people who will manage hiring', 'Return to the checklist whenever you need'],
  },
];

const aiProviders: Array<{ value: AiProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
];

export default function PlatformSetupClient() {
  const router = useRouter();
  const [stage, setStage] = React.useState<SetupStage>('account');
  const [tourIndex, setTourIndex] = React.useState(0);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [aiProvider, setAiProvider] = React.useState<AiProvider>('openai');
  const [aiApiKey, setAiApiKey] = React.useState('');
  const [aiModel, setAiModel] = React.useState(getProviderDefaultModel('openai'));
  const [showAiApiKey, setShowAiApiKey] = React.useState(false);
  const [isSavingAi, setIsSavingAi] = React.useState(false);
  const [aiConnectionStatus, setAiConnectionStatus] = React.useState<'idle' | 'saved' | 'verified'>('idle');
  const [aiMessage, setAiMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const submitAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/platform-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const payload = await readJsonObject(response);
      if (!response.ok) {
        throw new Error(getJsonErrorMessage(payload, 'Unable to create the administrator account.'));
      }

      const normalizedEmail = email.trim().toLowerCase();
      const authentication = await signIn('credentials', {
        email: normalizedEmail,
        password,
        redirect: false,
      });
      setIsAuthenticated(authentication?.ok === true);
      setEmail(normalizedEmail);
      setPassword('');
      setConfirmPassword('');
      setStage('ai');
    } catch (error) {
      console.error('First administrator setup failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete platform setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishSetup = () => {
    router.replace(isAuthenticated ? '/' : '/auth/signin');
    router.refresh();
  };

  const updateAiProvider = (provider: AiProvider) => {
    setAiProvider(provider);
    setAiModel(getProviderDefaultModel(provider));
    setAiConnectionStatus('idle');
    setAiMessage('');
  };

  const saveAiConnection = async (event: React.FormEvent) => {
    event.preventDefault();
    setAiMessage('');
    if (!isAuthenticated) {
      setAiMessage('Your administrator session is not active yet. Continue to sign in, then add the key from HR Setup.');
      return;
    }
    if (!aiApiKey.trim()) {
      setAiMessage('Enter an API key or skip this step.');
      return;
    }

    setIsSavingAi(true);
    try {
      const providerResponse = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ key: 'aiProviderSelection', value: aiProvider }]),
      });
      const providerPayload = await readJsonObject(providerResponse);
      if (!providerResponse.ok) {
        throw new Error(getJsonErrorMessage(providerPayload, 'Unable to select the AI provider.'));
      }

      await saveAiApiKeys({
        provider: aiProvider,
        apiKeys: [{ key: aiApiKey.trim(), priority: 1, selectedModel: aiModel.trim() || getProviderDefaultModel(aiProvider) }],
        fallbackMessage: 'Unable to save the AI API key.',
      });
      setAiApiKey('');
      setAiConnectionStatus('saved');

      const verification = await fetchAiAvailableModels(aiProvider);
      if (verification.models.length > 0) {
        setAiConnectionStatus('verified');
        setAiMessage(`Connection verified. ${verification.models.length} model${verification.models.length === 1 ? '' : 's'} available.`);
      } else {
        setAiMessage(verification.error || 'The key was saved securely, but the connection could not be verified yet.');
      }
    } catch (error) {
      console.error('AI setup failed:', error);
      setAiMessage(error instanceof Error ? error.message : 'Unable to configure the AI connection.');
      setAiConnectionStatus('idle');
    } finally {
      setIsSavingAi(false);
    }
  };

  const advanceTour = () => {
    if (tourIndex < tourSteps.length - 1) {
      setTourIndex((current) => current + 1);
      return;
    }
    setStage('complete');
  };

  const progress = stage === 'account'
    ? 15
    : stage === 'ai'
      ? 32
    : stage === 'complete'
      ? 100
      : 48 + Math.round(((tourIndex + 1) / tourSteps.length) * 40);

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[minmax(320px,0.8fr)_minmax(560px,1.2fr)]">
        <aside className="relative overflow-hidden bg-[#17345f] px-6 py-8 text-[#eef5ff] sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute -right-28 top-20 h-72 w-72 rounded-full border border-[#91b5e8]/20" />
          <div className="pointer-events-none absolute -right-12 top-36 h-44 w-44 rounded-full border border-[#91b5e8]/15" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-[#dceaff] text-[#17345f]">h</span>
              hrive
            </div>
            <div className="mt-10 max-w-md lg:mt-24">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#abc8ef]">First-run setup</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
                Build the foundation for better hiring.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#c8d9ef]">
                Create the first administrator, connect an AI provider, take a quick product tour, and initialize your working defaults.
              </p>
            </div>
          </div>

          <div className="relative mt-10 grid gap-3 text-sm sm:grid-cols-3 lg:mt-16 lg:grid-cols-1">
            {[
              [ShieldCheck, 'Secure ownership', 'Only the first administrator can complete this setup.'],
              [BriefcaseBusiness, 'Recruiting ready', 'Start with the workflows your team uses every day.'],
              [Sparkles, 'Guided defaults', 'Initialize each platform feature after sign-in.'],
            ].map(([Icon, title, description]) => {
              const ItemIcon = Icon as React.ComponentType<{ className?: string }>;
              return (
                <div key={String(title)} className="flex items-start gap-3 border-t border-[#86a9d7]/20 pt-3">
                  <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#bcd4f4]" />
                  <div>
                    <p className="font-semibold">{String(title)}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#b8cce7]">{String(description)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-[640px] items-center justify-center px-4 py-10 sm:px-8 lg:px-14">
          <div className="w-full max-w-xl">
            <div className="mb-8 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {stage === 'account' ? 'Administrator account' : stage === 'ai' ? 'AI connection' : stage === 'tour' ? 'Activation preview' : 'Account ready'}
                </span>
                <span className="text-slate-500">About 2 minutes for this phase</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-slate-200 dark:bg-slate-800" />
            </div>

            {stage === 'account' && (
              <form onSubmit={submitAdmin} className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">Step 1</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create the first administrator</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    This account owns platform configuration, permissions, and the initial team setup.
                  </p>
                </div>

                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="setup-name">Full name</Label>
                    <Input
                      id="setup-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="Nara Admin"
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-email">Work email</Label>
                    <Input
                      id="setup-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="admin@company.com"
                      maxLength={254}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="setup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      className="px-9"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    Use uppercase, lowercase, a number, and a special character.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-confirm-password">Confirm password</Label>
                  <Input
                    id="setup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <p className="max-w-xs text-xs leading-5 text-slate-500">
                    Setup closes permanently after this account is created.
                  </p>
                  <Button type="submit" disabled={isSubmitting} className="sm:min-w-44">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Create administrator
                  </Button>
                </div>
              </form>
            )}

            {stage === 'ai' && (
              <form onSubmit={saveAiConnection} className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">Step 2 · Optional</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Connect your AI provider</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Add one key to activate matching, evaluation, and writing assistance. The key is encrypted by the existing platform key manager.
                    </p>
                  </div>
                </div>

                {aiMessage && (
                  <Alert variant={aiConnectionStatus === 'idle' ? 'destructive' : 'default'}>
                    <AlertDescription className="flex items-start gap-2">
                      {aiConnectionStatus !== 'idle' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                      {aiMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="setup-ai-provider">AI provider</Label>
                    <Select value={aiProvider} onValueChange={(value) => updateAiProvider(value as AiProvider)} disabled={isSavingAi}>
                      <SelectTrigger id="setup-ai-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {aiProviders.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-ai-model">Default model</Label>
                    <Input
                      id="setup-ai-model"
                      value={aiModel}
                      onChange={(event) => setAiModel(event.target.value)}
                      disabled={isSavingAi}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-ai-key">API key</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="setup-ai-key"
                      type={showAiApiKey ? 'text' : 'password'}
                      value={aiApiKey}
                      onChange={(event) => {
                        setAiApiKey(event.target.value);
                        setAiConnectionStatus('idle');
                        setAiMessage('');
                      }}
                      autoComplete="off"
                      spellCheck={false}
                      className="px-9"
                      placeholder={aiProvider === 'openai' ? 'sk-…' : 'Paste provider API key'}
                      disabled={isSavingAi || aiConnectionStatus === 'verified'}
                      required={aiConnectionStatus === 'idle'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAiApiKey((current) => !current)}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      aria-label={showAiApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showAiApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    The browser sends this key only to the authenticated settings API. It is never returned in full.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <Button type="button" variant="ghost" disabled={isSavingAi} onClick={() => setStage('tour')}>
                    {aiConnectionStatus === 'idle' ? 'Skip for now' : 'Continue to tour'}
                  </Button>
                  {aiConnectionStatus === 'verified' ? (
                    <Button type="button" onClick={() => setStage('tour')}>
                      Continue to tour
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSavingAi || !isAuthenticated} className="sm:min-w-44">
                      {isSavingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Save and verify
                    </Button>
                  )}
                </div>
              </form>
            )}

            {stage === 'tour' && (() => {
              const step = tourSteps[tourIndex];
              const TourIcon = step.icon;
              return (
                <div className="space-y-7">
                  <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      <TourIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
                        {step.eyebrow}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{step.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {step.points.map((point) => (
                      <div key={point} className="flex items-center gap-3 py-3.5 text-sm">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="font-medium">{point}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5" aria-label={`Tour step ${tourIndex + 1} of ${tourSteps.length}`}>
                      {tourSteps.map((tourStep, index) => (
                        <span
                          key={tourStep.title}
                          className={`h-1.5 rounded-full transition-all ${index === tourIndex ? 'w-7 bg-blue-700 dark:bg-blue-300' : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {tourIndex > 0 && (
                        <Button type="button" variant="ghost" onClick={() => setTourIndex((current) => current - 1)}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                      )}
                      <Button type="button" onClick={advanceTour}>
                        {tourIndex === tourSteps.length - 1 ? 'Complete tour' : 'Next'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStage('complete')}
                    className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:hover:text-slate-200"
                  >
                    Skip the tour
                  </button>
                </div>
              );
            })()}

            {stage === 'complete' && (
              <div className="space-y-7">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Ready to continue</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">Your administrator account is ready.</h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Next, initialize the recommended workspace foundation. After that, one activation checklist will guide the remaining organization tasks.
                  </p>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Administrator login</p>
                    <p className="mt-1 text-sm font-semibold">{email}</p>
                  </div>
                  <Button type="button" onClick={finishSetup} className="sm:min-w-44">
                    {isAuthenticated ? 'Continue setup' : 'Continue to sign in'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
