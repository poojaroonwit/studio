"use client";

import React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Loader2,
  Monitor,
  Navigation,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { HeaderBrandingSection } from "./BrandingHeaderSection";
import { BrandingLoginBackgroundSection } from "./BrandingLoginBackgroundSection";
import { AppearanceDrawerStyleSection } from "./AppearanceDrawerStyleSection";
import { EvaluateSettingsContent } from "./EvaluateTab";
import { BrandingLogoUploadTile } from "./BrandingTabParts";
import type { BrandingTabProps } from "./BrandingTabTypes";
import { SplashScreenSection } from "./BrandingSplashSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Core Identity", description: "Set your primary brand and application identity." },
  { title: "Header Branding", description: "Tune header behavior and appearance inside the shell." },
  { title: "Sign In", description: "Customize how your brand appears on the sign-in screen." },
  { title: "Navigation", description: "Brand your navigation sidebar." },
  { title: "Review", description: "Review all branding before publishing." },
] as const;

function getBrandingStepFromFocus(focus: string | null): number {
  const normalized = focus?.toLowerCase() ?? "";

  if (["core-identity", "core identity", "coreidentity", "core"].includes(normalized)) return 0;
  if (["header-branding", "header branding", "headerbranding", "header"].includes(normalized)) return 1;
  if (["sign-in", "sign in", "signin", "sign"].includes(normalized)) return 2;
  if (["navigation", "nav"].includes(normalized)) return 3;
  if (["review"].includes(normalized)) return 4;

  return 0;
}

export function BrandingTab(props: BrandingTabProps) {
  const searchParams = useSearchParams();
  const stepFromFocus = React.useMemo(() => getBrandingStepFromFocus(searchParams.get("focus")), [searchParams]);
  const [step, setStep] = React.useState(stepFromFocus);
  const [usePrimaryLight, setUsePrimaryLight] = React.useState(!props.loginPageLogoLightModePreviewUrl);
  const [usePrimaryDark, setUsePrimaryDark] = React.useState(!props.loginPageLogoDarkModePreviewUrl);

  const goToStep = (nextStep: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, nextStep)));
  React.useEffect(() => {
    setStep(stepFromFocus);
  }, [stepFromFocus]);

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-0 max-h-full flex-col overflow-hidden">
      <BrandingProgress currentStep={step} />

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-card lg:grid-cols-[175px_minmax(0,1fr)_225px]">
        <BrandingStepRail currentStep={step} onStepChange={goToStep} />

        <ScrollArea className="min-h-0 border-l border-border">
          <div className="min-w-0 p-5 xl:p-6">
            {step === 0 && <CoreIdentityStep {...props} />}
            {step === 1 && <HeaderBrandingStep {...props} />}
            {step === 2 && (
              <SignInStep
                {...props}
                usePrimaryDark={usePrimaryDark}
                usePrimaryLight={usePrimaryLight}
                onUsePrimaryDarkChange={setUsePrimaryDark}
                onUsePrimaryLightChange={setUsePrimaryLight}
              />
            )}
            {step === 3 && <NavigationStep {...props} />}
            {step === 4 && <ReviewStep {...props} onEditStep={goToStep} />}
          </div>
        </ScrollArea>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-muted/10 p-5 lg:block">
          {step === 2 ? <SignInGuidance {...props} /> : <StepGuidance step={step} />}
        </aside>
      </div>

      <div data-autosave-ignore className="flex shrink-0 items-center justify-between border-x border-b border-border bg-card px-4 py-3">
        <Button variant="outline" onClick={() => goToStep(step - 1)} disabled={step === 0}>
          <ChevronLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={props.onSave} disabled={!props.canEdit || props.saving}>
            {props.saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {props.saving ? "Saving" : "Save draft"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => goToStep(step + 1)}>
              Continue to {STEPS[step + 1].title} <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={props.onSave} disabled={!props.canEdit || props.saving}>
              <Check className="mr-1.5 h-4 w-4" /> Publish branding
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandingProgress({ currentStep }: { currentStep: number }) {
  return (
    <header className="flex shrink-0 items-end justify-between pb-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Branding setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">{`${STEPS.length - 1} of ${STEPS.length} steps complete`}</p>
      </div>
      <div className="mb-1 flex gap-1.5" aria-label={`${STEPS.length - 1} of ${STEPS.length} branding steps complete`}>
        {STEPS.map((item, index) => (
          <span
            key={item.title}
            className={cn("h-1 w-12 rounded-full", index < STEPS.length - 1 ? "bg-primary" : "bg-muted-foreground/35")}
          />
        ))}
      </div>
    </header>
  );
}

function BrandingStepRail({ currentStep, onStepChange }: { currentStep: number; onStepChange: (step: number) => void }) {
  return (
    <nav data-autosave-ignore aria-label="Branding setup steps" className="bg-muted/5">
      {STEPS.map((item, index) => {
        const active = currentStep === index;
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => onStepChange(index)}
            className={cn(
              "relative flex w-full gap-3 border-b border-border px-4 py-5 text-left transition-colors hover:bg-muted/30",
              active && "bg-primary/5",
            )}
          >
            {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
            <span className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 text-muted-foreground",
            )}>
              {index === 0 ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{item.title}</span>
              {active && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>}
            </span>
            {index === 0 && !active && <CheckCircle2 className="ml-auto h-4 w-4 text-muted-foreground" />}
          </button>
        );
      })}
    </nav>
  );
}

function SignInStep({
  usePrimaryDark,
  usePrimaryLight,
  onUsePrimaryDarkChange,
  onUsePrimaryLightChange,
  ...props
}: BrandingTabProps & {
  usePrimaryDark: boolean;
  usePrimaryLight: boolean;
  onUsePrimaryDarkChange: (checked: boolean) => void;
  onUsePrimaryLightChange: (checked: boolean) => void;
}) {
  return (
    <section>
      <div className="mb-6">
        <h3 className="text-xl font-semibold">Sign In branding</h3>
        <p className="mt-1 text-sm text-muted-foreground">Preview how your brand will appear on the sign-in screen in both light and dark modes.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <SignInModeCard
          canEdit={props.canEdit}
          dark={false}
          inputId="guided-login-logo-light"
          logoUrl={usePrimaryLight ? props.logoPreviewUrl : props.loginPageLogoLightModePreviewUrl}
          ownLogoUrl={props.loginPageLogoLightModePreviewUrl}
          onChange={props.handleLoginPageLogoLightModeChange}
          onRemove={() => {
            props.setLoginPageLogoLightModePreviewUrl(null);
            props.setSavedLoginPageLogoLightModeUrl(null);
            onUsePrimaryLightChange(true);
          }}
          onUsePrimaryChange={onUsePrimaryLightChange}
          usePrimary={usePrimaryLight}
        />
        <SignInModeCard
          canEdit={props.canEdit}
          dark
          inputId="guided-login-logo-dark"
          logoUrl={usePrimaryDark ? props.logoPreviewUrl : props.loginPageLogoDarkModePreviewUrl}
          ownLogoUrl={props.loginPageLogoDarkModePreviewUrl}
          onChange={props.handleLoginPageLogoDarkModeChange}
          onRemove={() => {
            props.setLoginPageLogoDarkModePreviewUrl(null);
            props.setSavedLoginPageLogoDarkModeUrl(null);
            onUsePrimaryDarkChange(true);
          }}
          onUsePrimaryChange={onUsePrimaryDarkChange}
          usePrimary={usePrimaryDark}
        />
      </div>
      <details className="mt-6 rounded-md border border-border bg-muted/10">
        <summary data-autosave-ignore className="cursor-pointer list-none px-4 py-3 text-sm font-medium">Advanced sign-in background and layout</summary>
        <div className="border-t border-border px-4"><BrandingLoginBackgroundSection {...props} /></div>
      </details>
    </section>
  );
}

function SignInModeCard({ dark, inputId, logoUrl, ownLogoUrl, usePrimary, onUsePrimaryChange, onChange, onRemove, canEdit }: {
  dark: boolean;
  inputId: string;
  logoUrl: string | null;
  ownLogoUrl: string | null;
  usePrimary: boolean;
  onUsePrimaryChange: (checked: boolean) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  canEdit: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{dark ? "Dark mode" : "Light mode"}</h4>
        <label data-autosave-ignore className="flex items-center gap-2 text-xs text-muted-foreground">
          Use primary logo
          <Switch checked={usePrimary} onCheckedChange={onUsePrimaryChange} disabled={!canEdit} aria-label={`Use primary logo in ${dark ? "dark" : "light"} mode`} />
        </label>
      </div>

      <div className={cn("flex min-h-[330px] items-center justify-center rounded-md border p-4", dark ? "border-zinc-700 bg-[#10141b]" : "bg-[#eef2f7]") }>
        <div className={cn("w-full max-w-[250px] rounded-md border px-5 py-6 shadow-lg", dark ? "border-zinc-700 bg-[#151a22] text-white" : "border-slate-200 bg-white text-slate-950") }>
          <BrandLogo logoUrl={logoUrl} dark={dark} className="mx-auto mb-4 h-12 w-24" />
          <p className="text-center text-lg font-semibold">Welcome back</p>
          <p className={cn("mt-1 text-center text-xs", dark ? "text-zinc-400" : "text-slate-500")}>Sign in to continue to your account</p>
          <label className="mt-5 block text-xs">Email address</label>
          <div className={cn("mt-2 rounded border px-3 py-2 text-xs", dark ? "border-zinc-700 text-zinc-500" : "border-slate-300 text-slate-400")}>Enter your email</div>
          <div className="mt-3 rounded bg-primary py-2 text-center text-xs font-medium text-primary-foreground">Continue</div>
          <p className="mt-4 text-center text-xs text-primary">Need help signing in?</p>
        </div>
      </div>

      <div className="mt-3 flex min-h-14 items-center gap-3 rounded-md border border-border px-3 py-2">
        <BrandLogo logoUrl={logoUrl} dark={dark} className="h-8 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{ownLogoUrl ? `${dark ? "company-dark" : "company-logo"}.svg` : "Primary logo"}</p>
          <p className="text-[11px] text-muted-foreground">200 × 80px · image</p>
        </div>
        <Input id={inputId} type="file" accept="image/*" className="hidden" onChange={onChange} disabled={!canEdit} />
        <div className="flex flex-col border-l border-border pl-2">
          <label htmlFor={inputId} className={cn("flex cursor-pointer items-center gap-1 text-[11px] text-primary", !canEdit && "pointer-events-none opacity-50")}>
            <Upload className="h-3 w-3" /> Replace
          </label>
          {!usePrimary && ownLogoUrl && (
            <button type="button" onClick={onRemove} className="mt-1 flex items-center gap-1 text-[11px] text-primary" disabled={!canEdit}>
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ logoUrl, dark, className }: { logoUrl: string | null; dark?: boolean; className?: string }) {
  return logoUrl ? (
    <Image src={logoUrl} alt="Company logo" width={200} height={80} unoptimized className={cn("object-contain", className)} />
  ) : (
    <div className={cn("flex items-center justify-center", dark ? "text-teal-400" : "text-teal-500", className)}>
      <Building2 className="h-full w-full stroke-[1.7]" />
    </div>
  );
}

function SignInGuidance(props: BrandingTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold">Logo size</h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Adjust the logo size for optimal balance.</p>
        <div className="mt-4 flex items-center gap-3">
          <Slider min={60} max={160} step={1} value={[props.loginPageLogoSize]} onValueChange={([value]) => props.setLoginPageLogoSize(value)} disabled={!props.canEdit} />
          <span className="rounded border border-border px-2 py-1 text-xs">{props.loginPageLogoSize}px</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Range: 60px – 160px</p>
      </div>
      <div className="border-t border-border pt-5">
        <h4 className="text-sm font-semibold">Safe area</h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Ensure important logo elements remain clear.</p>
        <div className="mt-3 rounded border border-dashed border-muted-foreground/50 p-3">
          <div className="flex h-20 items-center justify-center border border-dashed border-muted-foreground/40">
            <BrandLogo logoUrl={props.logoPreviewUrl} className="h-10 w-16" />
          </div>
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>Minimum padding<br/><b className="text-foreground">16px</b></span><span>Recommended<br/><b className="text-foreground">16px</b></span></div>
      </div>
      <div className="border-t border-border pt-5">
        <h4 className="text-sm font-semibold">Background contrast</h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Ensure your logo is clearly visible on both backgrounds.</p>
        <p className="mt-4 flex items-center justify-between text-xs"><span>Light mode</span><span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Good contrast</span></p>
        <p className="mt-3 flex items-center justify-between text-xs"><span>Dark mode</span><span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" /> Check contrast</span></p>
        <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
          <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><span>Your dark mode logo may be hard to see on dark backgrounds.</span></div>
        </div>
      </div>
    </div>
  );
}

function CoreIdentityStep(props: BrandingTabProps) {
  return (
    <section className="space-y-6">
      <div><h3 className="text-xl font-semibold">Core Identity</h3><p className="mt-1 text-sm text-muted-foreground">Set the master logo and core application treatments used across your workspace.</p></div>
      <div className="rounded-md border border-border p-5">
        <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <div><h4 className="text-sm font-semibold">Primary logo</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Used as the fallback throughout the application.</p></div>
          <BrandingLogoUploadTile id="guided-primary-logo" previewUrl={props.logoPreviewUrl} alt="Primary company logo" canEdit={props.canEdit} onChange={props.handleLogoFileChange} onRemove={() => props.removeSelectedLogo(true)} emptyText="Upload primary logo" />
        </div>
      </div>
      <details className="rounded-md border border-border"><summary data-autosave-ignore className="cursor-pointer px-4 py-3 text-sm font-medium">Splash screen</summary><div className="border-t border-border px-4"><SplashScreenSection {...props} /></div></details>
      <details className="rounded-md border border-border"><summary data-autosave-ignore className="cursor-pointer px-4 py-3 text-sm font-medium">Application drawer style</summary><div className="border-t border-border px-4"><AppearanceDrawerStyleSection canEdit={props.canEdit} drawerStyle={props.drawerStyle} setDrawerStyle={props.setDrawerStyle} /></div></details>
      <details className="rounded-md border border-border"><summary data-autosave-ignore className="cursor-pointer px-4 py-3 text-sm font-medium">Evaluation experience</summary><div className="border-t border-border px-4"><EvaluateSettingsContent {...props} /></div></details>
    </section>
  );
}

function HeaderBrandingStep(props: BrandingTabProps) {
  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Header branding</h3>
        <p className="mt-1 text-sm text-muted-foreground">Fine-tune logo placement, header title, and drawer shell behavior.</p>
      </div>
      <div className="rounded-md border border-border p-5">
        <HeaderBrandingSection {...props} />
      </div>
    </section>
  );
}

function NavigationStep(props: BrandingTabProps) {
  const uploads = [
    ["Light · Collapsed", "guided-sidebar-light-collapsed", props.sidebarLogoCollapsedLightModePreviewUrl, props.handleSidebarLogoCollapsedLightModeChange, () => { props.setSidebarLogoCollapsedLightModePreviewUrl(null); props.setSavedSidebarLogoCollapsedLightModeUrl(null); }],
    ["Light · Expanded", "guided-sidebar-light-expanded", props.sidebarLogoExpandedLightModePreviewUrl, props.handleSidebarLogoExpandedLightModeChange, () => { props.setSidebarLogoExpandedLightModePreviewUrl(null); props.setSavedSidebarLogoExpandedLightModeUrl(null); }],
    ["Dark · Collapsed", "guided-sidebar-dark-collapsed", props.sidebarLogoCollapsedDarkModePreviewUrl, props.handleSidebarLogoCollapsedDarkModeChange, () => { props.setSidebarLogoCollapsedDarkModePreviewUrl(null); props.setSavedSidebarLogoCollapsedDarkModeUrl(null); }],
    ["Dark · Expanded", "guided-sidebar-dark-expanded", props.sidebarLogoExpandedDarkModePreviewUrl, props.handleSidebarLogoExpandedDarkModeChange, () => { props.setSidebarLogoExpandedDarkModePreviewUrl(null); props.setSavedSidebarLogoExpandedDarkModeUrl(null); }],
  ] as const;
  return (
    <section>
      <div><h3 className="text-xl font-semibold">Navigation branding</h3><p className="mt-1 text-sm text-muted-foreground">Upload compact and expanded logo treatments for both navigation themes.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {uploads.map(([label, id, url, onChange, onRemove]) => (
          <div key={id} className="rounded-md border border-border p-4">
            <h4 className="mb-3 text-sm font-medium">{label}</h4>
            <BrandingLogoUploadTile id={id} previewUrl={url} alt={label} canEdit={props.canEdit} onChange={onChange} onRemove={onRemove} size="large" emptyText="Upload logo" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewStep(props: BrandingTabProps & { onEditStep: (step: number) => void }) {
  const items = [
    ["Core Identity", props.logoPreviewUrl ? "Primary logo ready" : "Primary logo uses fallback", 0, Building2],
    ["Header Branding", "Header style and shell tokens configured", 1, ImageUp],
    ["Sign In", "Light and dark previews configured", 2, Monitor],
    ["Navigation", "Four responsive logo placements available", 3, Navigation],
  ] as const;
  return (
    <section>
      <div><h3 className="text-xl font-semibold">Review branding</h3><p className="mt-1 text-sm text-muted-foreground">Confirm each brand surface before publishing the workspace experience.</p></div>
      <div className="mt-6 space-y-3">
        {items.map(([title, detail, target, Icon]) => (
          <button data-autosave-ignore key={title} type="button" onClick={() => props.onEditStep(target)} className="flex w-full items-center gap-4 rounded-md border border-border p-4 text-left transition-colors hover:bg-muted/20">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-5"><div className="flex gap-3"><Sparkles className="h-5 w-5 text-primary" /><div><h4 className="text-sm font-semibold">Ready to publish</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Publishing saves these settings to the same live branding configuration used throughout the application.</p></div></div></div>
    </section>
  );
}

function StepGuidance({ step }: { step: number }) {
  const guidance = [
    ["Core Identity checklist", "Use a transparent SVG or PNG with generous internal padding.", ImageUp],
    ["Header branding", "Keep desktop and mobile header treatments visually consistent.", PanelsTopLeft],
    ["Sign In preview", "Preview light and dark modes before continuing.", Monitor],
    ["Navigation fit", "Keep collapsed marks square and expanded logos horizontal.", Navigation],
    ["Publishing", "Review each surface and save when everything looks right.", CheckCircle2],
  ] as const;
  const [title, description, Icon] = guidance[step];
  return <div><span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><h4 className="mt-4 text-sm font-semibold">{title}</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p></div>;
}
