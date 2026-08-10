"use client";

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, Clock3, Download, FileText, Flag, LockKeyhole, Menu, Pause, Play, ShieldCheck, Sparkles, Target, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AiAssignmentDialog } from './AiAssignmentDialog';

type Row = Record<string, any>;
type Detail = { course: Row; enrollment: Row | null; sections: Array<Row & { lessons: Array<Row & { blocks: Row[] }> }>; progress: Record<string, Row>; rules: Row; canManage?: boolean };

function minutes(seconds: number) {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function CourseExperience({ courseId, player = false }: { courseId: string; player?: boolean }) {
  const router = useRouter();
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = React.useState(false);
  const [selectedLessonId, setSelectedLessonId] = React.useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = React.useState(0);
  const load = React.useCallback(async () => {
    const response = await fetch(`/api/learning/courses/${courseId}`, { credentials: 'include' });
    const payload = await response.json();
    if (!response.ok) return setError(payload.message || 'Unable to load course');
    setDetail(payload.data);
    setSelectedLessonId(current => current || payload.data.enrollment?.current_lesson_id || payload.data.sections.flatMap((s: Row) => s.lessons)[0]?.id);
    setActiveSeconds(payload.data.enrollment?.active_seconds || 0);
  }, [courseId]);
  React.useEffect(() => { void load(); }, [load]);

  const start = async () => {
    setSaving(true);
    const response = await fetch(`/api/learning/courses/${courseId}`, { method: 'POST', credentials: 'include' });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) return setError(payload.message || 'Unable to start');
    router.push(`/learning/courses/${courseId}/learn`);
  };

  const lessons = detail?.sections.flatMap(section => section.lessons) || [];
  const selected = lessons.find(lesson => lesson.id === selectedLessonId) || lessons[0];
  const selectedIndex = lessons.findIndex(lesson => lesson.id === selected?.id);
  const progress = detail?.progress[selected?.id];

  React.useEffect(() => {
    if (!player || !detail?.enrollment || !selected || document.hidden || progress?.status === 'completed') return;
    let interactionAt = Date.now();
    const active = () => { interactionAt = Date.now(); };
    window.addEventListener('pointerdown', active);
    window.addEventListener('keydown', active);
    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() - interactionAt > 60_000) return;
      setActiveSeconds(value => value + 15);
      void fetch('/api/learning/progress', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat', enrollmentId: detail.enrollment!.id, lessonId: selected.id, seconds: 15 }),
      });
    }, 15_000);
    return () => { clearInterval(timer); window.removeEventListener('pointerdown', active); window.removeEventListener('keydown', active); };
  }, [detail?.enrollment, player, progress?.status, selected]);

  if (error) return <main className="grid min-h-[70vh] place-items-center p-6"><div className="max-w-md text-center"><h1 className="text-xl font-semibold">Learning is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button asChild variant="outline" className="mt-5"><Link href="/learning/courses">Back to courses</Link></Button></div></main>;
  if (!detail) return <main className="min-h-[70vh] bg-[#f4f1e9] p-6 dark:bg-zinc-950"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-4 w-36 rounded-full bg-[#d9d5c9] dark:bg-zinc-800" /><div className="mt-8 h-80 rounded-[28px] bg-[#e6e1d5] dark:bg-zinc-900" /></div></main>;
  if (player) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-50/60 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open syllabus"><Menu className="h-5 w-5" /></Button>
        <Link href={`/learning/courses/${courseId}`} className="hidden items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 sm:flex dark:text-zinc-300"><ArrowLeft className="h-4 w-4" />Course overview</Link>
        <div className="mx-auto min-w-0 text-center"><p className="truncate text-sm font-bold">{detail.course.title}</p><p className="text-xs text-slate-500">{detail.enrollment?.progress || 0}% complete</p></div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"><Clock3 className="h-4 w-4" />{minutes(activeSeconds)}</div>
      </header>
      <div className="grid flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={cn('border-r border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:block', menuOpen ? 'block' : 'hidden')}>
          <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-slate-500">Syllabus</p>
          <Syllabus detail={detail} selected={selected?.id} onSelect={id => { setSelectedLessonId(id); setMenuOpen(false); }} compact />
        </aside>
        <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-300">Lesson {selectedIndex + 1} of {lessons.length}</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em] sm:text-4xl">{selected?.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-300">{selected?.description}</p></div>
          <div className="space-y-8">{selected?.blocks.map(block => <ContentBlock key={block.id} block={block} detail={detail} lesson={selected} onDone={load} />)}</div>
          <div className="mt-auto flex items-center justify-between border-t border-slate-300 pt-6 dark:border-zinc-700">
            <Button variant="ghost" disabled={selectedIndex <= 0} onClick={() => setSelectedLessonId(lessons[selectedIndex - 1]?.id)}>Previous</Button>
            <div className="hidden text-center text-xs text-slate-500 sm:block">{progress?.status === 'completed' ? 'Lesson complete' : 'Complete all required content to continue'}</div>
            <Button disabled={!lessons[selectedIndex + 1]?.unlocked} onClick={() => setSelectedLessonId(lessons[selectedIndex + 1]?.id)}>Next lesson<ChevronRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </main>
      </div>
    </div>
  );

  const completed = lessons.filter(lesson => detail.progress[lesson.id]?.status === 'completed').length;
  const isDraft = detail.course.status !== 'published' || detail.course.version_status === 'draft';
  const lessonOptions = detail.sections.flatMap(section => section.lessons.map(lesson => ({ id: String(lesson.id), title: String(lesson.title), sectionTitle: String(section.title) })));
  return (
    <main className="min-h-full w-full bg-[#f4f1e9] px-4 py-6 text-[#17251f] dark:bg-[#111613] dark:text-[#edf4ee] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/learning/courses" className="group inline-flex items-center gap-2 text-sm font-semibold text-[#506059] transition-colors hover:text-[#17251f] dark:text-[#aab8ae] dark:hover:text-white"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />All courses</Link>
          {detail.canManage && <Button type="button" variant="ghost" className="h-9 rounded-full px-4 text-[#315f50] hover:bg-[#e4e8da] dark:text-[#b9d5c8] dark:hover:bg-white/10" onClick={() => setAssignmentDialogOpen(true)}><Sparkles className="mr-2 h-4 w-4" />Create AI assignment</Button>}
        </div>
        <section className="relative mt-6 grid gap-8 overflow-hidden rounded-[28px] bg-[#173f35] p-7 text-[#f5f3e9] shadow-[0_24px_70px_rgba(28,48,39,0.16)] sm:p-10 lg:min-h-[390px] lg:grid-cols-[minmax(0,1fr)_340px] lg:p-12">
          <div className="pointer-events-none absolute -right-20 -top-48 h-[430px] w-[430px] rounded-full border-[72px] border-[#d8e06f]/80" aria-hidden="true" />
          <div className="relative flex flex-col justify-between"><div><div className="flex gap-2"><span className="text-xs font-bold uppercase tracking-[.18em] text-[#dce7dc]">{detail.course.category || 'General'}</span>{detail.course.is_required && <span className="rounded-full bg-[#f3d58a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#423616]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Required</span>}</div><h1 className="mt-6 max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[.96] tracking-[-.06em]">{detail.course.title}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-[#d8e5de] sm:text-lg">{detail.course.description || 'A focused learning experience designed to help you put new skills into practice.'}</p></div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold text-[#e9f0eb]"><span><Clock3 className="mr-2 inline h-4 w-4 text-[#d8e06f]" />{detail.course.duration_hours || 0} hours</span><span><BookOpen className="mr-2 inline h-4 w-4 text-[#d8e06f]" />{lessons.length} lessons</span><span><Target className="mr-2 inline h-4 w-4 text-[#d8e06f]" />Pass at {detail.rules.passingScore}%</span></div></div>
          <div className="relative self-end rounded-[22px] bg-[#f7f4e9] p-6 text-[#17251f] shadow-[0_18px_50px_rgba(7,28,22,.22)] sm:p-8"><div className="flex justify-between text-sm font-bold"><span className="uppercase tracking-[.14em] text-[#68766f]">{isDraft ? 'Draft preview' : detail.enrollment ? 'Welcome back' : 'Ready when you are'}</span>{!isDraft && <span className="text-3xl tracking-[-.05em] text-[#315f50]">{detail.enrollment?.progress || 0}%</span>}</div>{isDraft ? <p className="mt-5 text-sm leading-6 text-[#66736d]">Add curriculum in Studio, review the learner flow, then publish when it is ready for employees.</p> : <><Progress value={detail.enrollment?.progress || 0} className="mt-6 h-2.5 bg-[#dddccd] [&>div]:bg-[#ef765f]" /><p className="mt-3 text-sm text-[#66736d]">{completed} of {lessons.length} lessons complete</p></>}<p className="mt-8 flex items-center gap-2 text-xs font-semibold text-[#66736d]"><Flag className="h-4 w-4" />Your next step is saved automatically</p>{isDraft ? <Button asChild className="mt-4 h-12 w-full rounded-full bg-[#173f35] hover:bg-[#245648]"><Link href={`/learning/courses/${courseId}/studio`}>Open Course Studio<ChevronRight className="ml-2 h-4 w-4" /></Link></Button> : <Button className="mt-4 h-12 w-full rounded-full bg-[#173f35] hover:bg-[#245648]" onClick={start} disabled={saving}>{saving ? 'Opening…' : detail.enrollment ? 'Continue learning' : 'Start course'}<Play className="ml-2 h-4 w-4 fill-current" /></Button>}</div>
        </section>
        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:py-14"><div><div className="flex items-end justify-between gap-4 border-b border-[#cfcfc2] pb-5 dark:border-white/15"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#68766f] dark:text-[#9eaaa2]">Course journey</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.045em]">What you’ll learn</h2></div><span className="hidden text-sm font-medium text-[#68766f] sm:block">{lessons.length} lessons · {detail.course.duration_hours || 0}h total</span></div><div className="mt-2"><Syllabus detail={detail} /></div></div><aside className="space-y-8"><section className="border-t-4 border-[#ef765f] bg-[#e5e9d9] p-6 dark:bg-[#1c2923]"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#68766f] dark:text-[#9eaaa2]">How to complete</p><h2 className="mt-3 text-xl font-semibold tracking-[-.03em]">A clear path to the finish</h2><ul className="mt-6 space-y-4 text-sm text-[#435149] dark:text-[#c6d2ca]"><li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#315f50]" />Complete lessons in sequence</li><li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#315f50]" />Watch required video content</li><li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#315f50]" />Pass quizzes within {detail.rules.maxAttempts} attempts</li><li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#315f50]" />Submit assignments for review</li></ul></section><p className="px-1 text-xs leading-5 text-[#78837d] dark:text-[#8e9a92]">Activity tracking provides reasonable completion evidence; it does not prove continuous attention.</p></aside></section>
      </div>
      <AiAssignmentDialog courseId={courseId} courseTitle={String(detail.course.title || 'Course')} lessons={lessonOptions} open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen} onCreated={() => void load()} />
    </main>
  );
}

function Syllabus({ detail, selected, onSelect, compact = false }: { detail: Detail; selected?: string; onSelect?: (id: string) => void; compact?: boolean }) {
  return <div className={cn(compact ? 'space-y-6' : 'divide-y divide-[#cfcfc2] dark:divide-white/15')}>{detail.sections.map((section, sectionIndex) => <section key={section.id} className={cn(!compact && 'grid gap-4 py-7 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-8')}><h3 className={cn('text-xs font-bold uppercase tracking-[.14em] text-slate-500', compact && 'mb-2', !compact && 'pt-3 text-[#68766f] dark:text-[#9eaaa2]')}>{String(sectionIndex + 1).padStart(2,'0')} · {section.title}</h3><div className={cn(!compact && 'space-y-1')}>{section.lessons.map((lesson: Row, lessonIndex: number) => {
    const status = detail.progress[lesson.id]?.status;
    return <button type="button" key={lesson.id} disabled={!lesson.unlocked || !onSelect} onClick={() => onSelect?.(lesson.id)} className={cn('flex w-full items-center gap-3 text-left transition', compact ? 'border-t border-slate-300 px-1 py-3 text-sm dark:border-zinc-700' : 'rounded-xl px-2 py-3.5 sm:px-3', selected === lesson.id && 'font-bold text-[#315f50] dark:text-[#9bc4b1]', onSelect && lesson.unlocked && (compact ? 'hover:pl-2' : 'hover:bg-[#e8e6dc] dark:hover:bg-white/5'))}><span className={cn(!compact && 'grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#b9beb4] text-[11px] font-bold text-[#68766f] dark:border-white/20 dark:text-[#aab5ae]')}>{status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : compact ? (lesson.unlocked ? <Play className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4 text-slate-400" />) : String(lessonIndex + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{lesson.title}</span><span className="text-xs font-medium text-[#78837d] dark:text-[#98a39c]">{lesson.estimated_minutes} min</span></button>;
  })}</div></section>)}</div>;
}

function ContentBlock({ block, detail, lesson, onDone }: { block: Row; detail: Detail; lesson: Row; onDone: () => void }) {
  const content = block.content || {};
  const completed = (detail.progress[lesson.id]?.completed_blocks || []).includes(block.id);
  const mark = async () => {
    await fetch('/api/learning/progress', { method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'complete_block',enrollmentId:detail.enrollment?.id,lessonId:lesson.id,blockId:block.id}) });
    onDone();
  };
  if (block.type === 'text') return <article className="prose prose-slate max-w-none dark:prose-invert"><h2>{block.title}</h2><div className="whitespace-pre-wrap">{content.text as string}</div>{block.required && !completed && <Button variant="outline" className="mt-5" onClick={mark}><Check className="mr-2 h-4 w-4" />Mark as read</Button>}</article>;
  if (block.type === 'video') return <VideoBlock block={block} detail={detail} lesson={lesson} onDone={onDone} />;
  if (block.type === 'attachment' || block.type === 'acknowledgement') return <section className="flex items-center gap-4 border-y border-slate-300 py-5 dark:border-zinc-700"><FileText className="h-8 w-8" /><div className="flex-1"><h2 className="font-bold">{block.title}</h2><p className="text-sm text-slate-500">{content.description as string}</p></div><Button asChild variant="outline"><a href={content.url as string} download onClick={() => block.type === 'attachment' && void mark()}><Download className="mr-2 h-4 w-4" />Open</a></Button>{block.type === 'acknowledgement' && <Button disabled={completed} onClick={mark}>{completed ? 'Acknowledged' : 'I acknowledge'}</Button>}</section>;
  if (block.type === 'break') return <section className="rounded-[8px] border border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-900/70 dark:bg-indigo-950/30"><Pause className="h-5 w-5 text-indigo-700 dark:text-indigo-300" /><h2 className="mt-3 text-xl font-bold">{block.title || 'Take a break'}</h2><p className="mt-2 text-sm">Rest for {content.minutes as number || 5} minutes. Break time is not counted as learning time.</p><Button variant="outline" className="mt-4" onClick={mark} disabled={completed}>{completed ? 'Break complete' : 'Return to learning'}</Button></section>;
  if (block.type === 'quiz') return <Quiz block={block} detail={detail} lesson={lesson} onDone={onDone} />;
  if (block.type === 'assignment') return <Assignment block={block} detail={detail} />;
  return null;
}

function VideoBlock({block,detail,lesson,onDone}:{block:Row;detail:Detail;lesson:Row;onDone:()=>void}) {
  const ref=React.useRef<HTMLVideoElement>(null);const furthest=React.useRef(Number(detail.progress[lesson.id]?.furthest_second||0));const lastSent=React.useRef(0);const [message,setMessage]=React.useState('');
  const update=()=>{const video=ref.current;if(!video)return;if(video.currentTime>furthest.current+1.5){video.currentTime=furthest.current;setMessage('Continue watching before skipping ahead.');return}furthest.current=Math.max(furthest.current,video.currentTime);if(video.currentTime-lastSent.current>=10&&detail.enrollment){lastSent.current=video.currentTime;void fetch('/api/learning/progress',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'heartbeat',enrollmentId:detail.enrollment.id,lessonId:lesson.id,seconds:0,furthestSecond:Math.floor(furthest.current)})})}};
  const finish=async()=>{if(!detail.enrollment)return;const r=await fetch('/api/learning/progress',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'complete_block',enrollmentId:detail.enrollment.id,lessonId:lesson.id,blockId:block.id})});const p=await r.json();setMessage(r.ok?'Video requirement complete.':p.message);if(r.ok)onDone()};
  return <section><h2 className="mb-3 text-xl font-bold">{block.title}</h2><video ref={ref} className="aspect-video w-full bg-black" controls controlsList="nodownload" src={block.content?.url} onTimeUpdate={update} onSeeking={update} onEnded={()=>void finish()}/><p className="mt-2 text-xs text-slate-500">Watch at least {block.content?.requiredWatchPercent||90}%. Forward seeking is limited to your furthest confirmed position.</p>{message&&<p role="status" className="mt-2 text-sm font-semibold">{message}</p>}</section>
}

function Assignment({ block, detail }: { block: Row; detail: Detail }) {
  const [text,setText]=React.useState('');
  const [fileUrl,setFileUrl]=React.useState('');
  const [message,setMessage]=React.useState('');
  const submit=async()=>{const response=await fetch('/api/learning/progress',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit_assignment',enrollmentId:detail.enrollment?.id,blockId:block.id,text,fileUrl})});const payload=await response.json();setMessage(response.ok?'Submitted for HR review.':payload.message||'Unable to submit');};
  return <section><Upload className="h-5 w-5" /><h2 className="mt-3 text-xl font-bold">{block.title}</h2><p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{block.content?.instructions}</p><textarea value={text} onChange={e=>setText(e.target.value)} className="mt-4 min-h-32 w-full border border-slate-300 bg-transparent p-3 text-sm dark:border-zinc-700" placeholder="Write your response…"/><input value={fileUrl} onChange={e=>setFileUrl(e.target.value)} className="mt-3 h-10 w-full border border-slate-300 bg-transparent px-3 text-sm dark:border-zinc-700" placeholder="Attachment URL (optional)"/><Button className="mt-3" onClick={submit} disabled={!text.trim()&&!fileUrl.trim()}>Submit assignment</Button>{message&&<p className="mt-2 text-sm" role="status">{message}</p>}</section>;
}

function Quiz({ block, detail, onDone }: { block: Row; detail: Detail; lesson: Row; onDone: () => void }) {
  const questions = Array.isArray(block.content?.questions) ? block.content.questions : [];
  const [answers,setAnswers]=React.useState<Record<string,string>>({});
  const [result,setResult]=React.useState<Row|null>(null);
  const submit=async()=>{const response=await fetch('/api/learning/progress',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit_quiz',enrollmentId:detail.enrollment?.id,blockId:block.id,answers})});const payload=await response.json();setResult(response.ok?payload.data:{message:payload.message});if(payload.data?.passed)onDone();};
  return <section><h2 className="text-xl font-bold">{block.title || 'Knowledge check'}</h2><div className="mt-5 space-y-6">{questions.map((question:Row)=><fieldset key={question.id}><legend className="text-sm font-semibold">{question.prompt}</legend><div className="mt-2 space-y-2">{(question.options||[]).map((option:string)=><label key={option} className="flex gap-3 text-sm"><input type="radio" name={question.id} value={option} onChange={()=>setAnswers(a=>({...a,[question.id]:option}))}/>{option}</label>)}</div></fieldset>)}</div><Button className="mt-5" onClick={submit} disabled={Object.keys(answers).length<questions.length}>Submit answers</Button>{result&&<p role="status" className={cn('mt-3 text-sm font-semibold',result.passed?'text-emerald-700':'text-rose-700')}>{result.message || `${result.score}% — ${result.passed?'Passed':'Try again'}`}</p>}</section>;
}
