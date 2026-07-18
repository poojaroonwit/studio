import Link from "next/link";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ElementType } from "react";

const sourceNodes = [
  { label: "LinkedIn", icon: UsersIcon, className: "left-[7%] top-[18%]" },
  { label: "Inbox", icon: EnvelopeIcon, className: "left-[16%] top-[33%]" },
  { label: "Job boards", icon: BriefcaseIcon, className: "left-[8%] bottom-[27%]" },
  { label: "Referrals", icon: SparklesIcon, className: "left-[24%] bottom-[16%]" },
];

const outputNodes = [
  { label: "Taskboard", icon: ClipboardDocumentListIcon, className: "right-[10%] top-[17%]" },
  { label: "Calendar", icon: CalendarDaysIcon, className: "right-[22%] top-[34%]" },
  { label: "Pipeline", icon: ChartBarIcon, className: "right-[8%] bottom-[29%]" },
  { label: "Reviews", icon: CheckCircleIcon, className: "right-[25%] bottom-[15%]" },
];

const partnerNames = ["Bessemer", "Outreach", "Okta", "Google", "Rippling", "Redpanda"];

export function RecruitmentLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf8] text-[#080720]">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <DecorativeFrame />
        <LandingNav />

        <div className="relative z-10 flex flex-1 flex-col items-center pt-16 text-center sm:pt-20 lg:pt-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ece8df] bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#6f66a8] shadow-sm shadow-slate-200/40">
            <SparklesIcon className="h-3.5 w-3.5" />
            HRI AI for recruitment teams
          </p>

          <h1 className="max-w-3xl text-balance text-[44px] font-semibold leading-[0.98] tracking-normal text-[#090820] sm:text-[64px] lg:text-[76px]">
            Powerful hiring tools for modern recruiters
          </h1>

          <p className="mt-6 max-w-xl text-balance text-sm leading-6 text-[#6e6a7d] sm:text-[15px]">
            Connect resumes, positions, interview plans, and candidate signals in one calm workspace built for fast hiring decisions.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#070620] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(7,6,32,0.18)] transition hover:-translate-y-0.5 hover:bg-[#13113b]"
            >
              Book a demo
            </Link>
            <Link
              href="/auth/signin"
              className="hidden h-10 items-center justify-center rounded-md border border-[#e8e4dc] bg-white/70 px-5 text-sm font-semibold text-[#080720] transition hover:-translate-y-0.5 hover:bg-white sm:inline-flex"
            >
              Sign in
            </Link>
          </div>

          <WorkflowDiagram />

          <div className="relative z-10 mt-auto w-full pb-2 pt-12 sm:pt-16">
            <p className="text-xs font-medium text-[#797487]">
              Built for recruiting teams that need cleaner candidate operations
            </p>
            <div className="mx-auto mt-7 grid max-w-6xl grid-cols-2 gap-x-8 gap-y-5 text-[18px] font-semibold text-[#c6c1bd] sm:grid-cols-3 lg:grid-cols-6">
              {partnerNames.map((name) => (
                <div key={name} className="flex items-center justify-center tracking-normal">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LandingNav() {
  return (
    <header className="relative z-20 flex h-12 items-center justify-between">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#080720]">
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute h-3.5 w-3.5 rotate-45 rounded-[3px] bg-[#f0d18b]" />
          <span className="absolute h-3.5 w-3.5 -translate-x-1.5 translate-y-1.5 rotate-45 rounded-[3px] bg-[#f6b44b]/75" />
        </span>
        HRI
      </Link>

      <nav className="hidden items-center gap-9 text-xs font-semibold text-[#242236] md:flex">
        <Link href="/dashboard" className="transition hover:text-[#6553d8]">Solution</Link>
        <Link href="/applicants" className="inline-flex items-center gap-1.5 transition hover:text-[#6553d8]">
          <SparklesIcon className="h-3.5 w-3.5 text-[#7669dc]" />
          HRI AI
        </Link>
        <Link href="/positions" className="transition hover:text-[#6553d8]">Positions</Link>
        <Link href="/process-queue" className="transition hover:text-[#6553d8]">Queue</Link>
      </nav>

      <div className="flex items-center gap-3 text-xs font-semibold">
        <Link href="/auth/signin" className="hidden text-[#242236] transition hover:text-[#6553d8] sm:inline">
          Sign in
        </Link>
        <Link
          href="/auth/signin"
          className="inline-flex h-9 items-center rounded-md bg-[#070620] px-4 text-white transition hover:bg-[#13113b]"
        >
          Book a demo
        </Link>
      </div>
    </header>
  );
}

function DecorativeFrame() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-24 top-0 h-48 w-[380px] rounded-br-[72px] border-b border-r border-[#eeeae4]" />
      <div className="absolute -right-24 top-16 h-32 w-[360px] rounded-bl-[72px] border-b border-l border-[#eeeae4]" />
      <div className="absolute left-0 top-[44%] h-px w-[26%] bg-[#eeeae4]" />
      <div className="absolute right-0 top-[44%] h-px w-[26%] bg-[#eeeae4]" />
    </div>
  );
}

function WorkflowDiagram() {
  return (
    <div className="relative mt-16 h-[360px] w-full max-w-6xl sm:mt-20">
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1160 360"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M0 130H260C292 130 292 180 326 180H458" stroke="#e7e2db" />
        <path d="M0 250H240C288 250 288 180 326 180" stroke="#e7e2db" />
        <path d="M0 52H230C292 52 286 180 326 180" stroke="#e7e2db" />
        <path d="M702 180H835C875 180 868 52 930 52H1160" stroke="#e7e2db" />
        <path d="M835 180C875 180 875 130 930 130H1160" stroke="#e7e2db" />
        <path d="M835 180C875 180 875 250 930 250H1160" stroke="#e7e2db" />
        <path d="M835 180C875 180 875 318 930 318H1160" stroke="#e7e2db" />
      </svg>

      <div className="absolute left-[27%] top-1/2 hidden -translate-y-1/2 items-center gap-2 text-xs font-semibold text-[#302d43] sm:flex">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#080720] text-white">1</span>
        Connect
      </div>
      <div className="absolute right-[27%] top-1/2 hidden -translate-y-1/2 items-center gap-2 text-xs font-semibold text-[#302d43] sm:flex">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#080720] text-white">2</span>
        Sync
      </div>

      {[...sourceNodes, ...outputNodes].map((node) => (
        <DiagramNode key={node.label} {...node} />
      ))}

      <div className="absolute left-1/2 top-[47%] w-[min(92vw,430px)] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-[8px] border border-[#ece7df] bg-white shadow-[0_18px_45px_rgba(43,36,28,0.10)]">
          <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3 text-left text-[12px] text-[#615b70]">
            <SparklesIcon className="h-4 w-4 text-[#7369dd]" />
            <span>Show candidates with strong fit scores that have not moved in 10 days</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#f0ece6] px-3 py-4">
            {["Courtney H.", "Savannah N.", "Floyd M."].map((name, index) => (
              <div key={name} className="px-3 text-left">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#efeaf7] text-[10px] font-bold text-[#5146b8]">
                    {index + 1}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-[#262336]">{name}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#f1eee8]" />
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto -mt-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#ece7df] bg-white shadow-[0_18px_38px_rgba(43,36,28,0.12)]">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2ec]">
            <MagnifyingGlassIcon className="h-5 w-5 text-[#090820]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagramNode({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon: ElementType<{ className?: string }>;
  className: string;
}) {
  return (
    <div className={`absolute hidden -translate-x-1/2 -translate-y-1/2 sm:block ${className}`}>
      <div className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#eee8df] bg-white shadow-[0_10px_25px_rgba(31,26,16,0.08)]">
        <Icon className="h-[18px] w-[18px] text-[#6553d8]" />
        <span className="absolute top-11 whitespace-nowrap rounded-md border border-[#eee8df] bg-white px-2 py-1 text-[10px] font-semibold text-[#514d61] opacity-0 shadow-sm transition group-hover:opacity-100">
          {label}
        </span>
      </div>
    </div>
  );
}
