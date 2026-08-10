"use client";

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Ellipsis,
  FileText,
  HeartHandshake,
  KeyRound,
  Loader2,
  LockKeyhole,
  MessageCircle,
  MessageCircleMore,
  UserRound,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supportCreateSchema } from '@/lib/service-desk-contract';
import { useServiceDeskCategories } from '@/hooks/use-service-desk-categories';
import { cn } from '@/lib/utils';
import {
  buildHrWidgetSubject,
  hasEnoughHrWidgetMessageDetail,
} from './hr-help-widget-utils';

type CreateResponse = {
  id?: string;
  requestNumber?: string;
  message?: string;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string; citations?: string[] };
type AiResponse = { answer?: string; message?: string; citations?: string[]; requiresHuman?: boolean };

export function HrHelpWidget({
  appLogoUrl: _appLogoUrl,
  currentAppName: _currentAppName,
}: {
  appLogoUrl?: string | null;
  currentAppName?: string;
}) {
  const pathname = usePathname();
  const { t } = useLocalization();
  const categories = useServiceDeskCategories();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [humanRequested, setHumanRequested] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  useEffect(() => {
    if (category && !categories.some(option => option.key === category)) {
      setCategory('');
      setChatStarted(false);
    }
  }, [categories, category]);

  function resetConversation() {
    setCategory('');
    setChatStarted(false);
    setMessage('');
    setError('');
    setCreated(null);
    setHumanRequested(false);
    setChatMessages([]);
  }

  function startChat(categoryKey: string) {
    setCategory(categoryKey);
    setChatStarted(true);
    setHumanRequested(false);
    setChatMessages([]);
    setError('');
  }

  function returnToCategories() {
    setChatStarted(false);
    setCategory('');
    setMessage('');
    setError('');
    setHumanRequested(false);
    setChatMessages([]);
  }

  async function createSupportRequest(inputMessage: string) {
    const selected = categories.find(option => option.key === category);
    if (!selected) {
      setError(t('serviceDesk.widget.selectCategory', 'Please choose a topic first.'));
      return false;
    }

    const fallbackInput = `Please review my request for ${selected.label} with the People Team.`;
    const normalizedInput = inputMessage.trim() || (
      [...chatMessages]
        .reverse()
        .find(item => item.role === 'user')
        ?.content
        .trim()
        || fallbackInput
    );

    if (!hasEnoughHrWidgetMessageDetail(normalizedInput)) {
      setError(t('serviceDesk.widget.messageTooShort', 'Please add a little more detail so HR can help (at least 10 characters).'));
      return false;
    }

    const conversation = chatMessages
      .map(item => `${item.role === 'user' ? 'Employee' : 'People team'}: ${item.content}`)
      .join('\n');
    const description = conversation
      ? `${normalizedInput}\n\nConversation history:\n${conversation}`
      : normalizedInput;

    const payload = {
      category,
      subject: buildHrWidgetSubject(normalizedInput),
      description: description.slice(0, 5000),
      metadata: { intent: 'request' as const, source: 'hr-help-widget', channel: 'human' as const },
    };

    const parsed = supportCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(t('serviceDesk.widget.messageTooShort', 'Please add a little more detail so HR can help (at least 10 characters).'));
      return false;
    }

    setSending(true);
    try {
      const response = await fetch('/api/privacy-support/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json().catch(() => ({})) as CreateResponse;
      if (!response.ok || !data.id) {
        setError(data.message || t('serviceDesk.widget.sendError', 'We could not send your message. Please try again.'));
        return false;
      }
      setCreated(data);
      setMessage('');
      return true;
    } catch {
      setError(t('serviceDesk.widget.networkError', 'HR chat is unavailable right now. Check your connection and try again.'));
      return false;
    } finally {
      setSending(false);
    }
  }

  async function switchToHumanFromMessage() {
    setError('');
    setHumanRequested(true);
    return createSupportRequest(message);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !sending) resetConversation();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!hasEnoughHrWidgetMessageDetail(message)) {
      setError(t('serviceDesk.widget.messageTooShort', 'Please add a little more detail so HR can help (at least 10 characters).'));
      return;
    }

    const selected = categories.find(option => option.key === category);
    if (selected && !humanRequested) {
      const userMessage: ChatMessage = { role: 'user', content: message.trim() };
      const history = chatMessages.map(({ role, content }) => ({ role, content }));
      setChatMessages(current => [...current, userMessage]);
      setMessage('');
      setSending(true);
      try {
        const response = await fetch('/api/privacy-support/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, message: userMessage.content, history }),
        });
        const data = await response.json().catch(() => ({})) as AiResponse;
        const answer = data.answer || data.message;
        if (answer) setChatMessages(current => [...current, { role: 'assistant', content: answer, citations: data.citations }]);
        if (data.requiresHuman) setHumanRequested(true);
        if (!response.ok) setError(data.message || t('serviceDesk.widget.sendError', 'We could not answer your message. Please try again or talk with a human.'));
      } catch {
        setError(t('serviceDesk.widget.networkError', 'The HR assistant is unavailable right now. You can talk with a human instead.'));
        setHumanRequested(true);
      } finally {
        setSending(false);
      }
      return;
    }

    await createSupportRequest(message);
  }

  const serviceDeskHref = created?.id
    ? `/service-desk?ticket=${encodeURIComponent(created.id)}`
    : '/service-desk';
  const selectedCategory = categories.find(option => option.key === category) || null;
  const SelectedCategoryIcon = selectedCategory ? getCategoryIcon(selectedCategory.key) : MessageCircle;
  const isConversationView = chatStarted && !created;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('serviceDesk.widget.talkWithHr', 'Talk with HR')}
          aria-haspopup="dialog"
          className="group no-print fixed bottom-20 right-4 z-[110] flex h-12 w-[166px] items-center justify-center gap-2.5 rounded-full border-0 bg-[#123f35] px-3 text-emerald-50 shadow-[0_12px_28px_rgba(9,45,37,.3),0_3px_8px_rgba(2,6,23,.14)] transition duration-300 hover:-translate-y-1 hover:bg-[#0e342c] hover:shadow-[0_18px_40px_rgba(9,45,37,.36),0_5px_12px_rgba(2,6,23,.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:bottom-7 md:right-7"
        >
          <MessageCircleMore className="!h-[20px] !w-[20px] shrink-0 transition-transform duration-300 group-hover:scale-105" strokeWidth={2} aria-hidden="true" />
          <span className="whitespace-nowrap text-[16px] font-semibold tracking-[-0.015em]">
            {t('serviceDesk.widget.talkWithHr', 'Talk with HR')}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        role="dialog"
        aria-label={t('serviceDesk.widget.title', 'Chat with HR')}
        align="end"
        side="top"
        sideOffset={isConversationView ? 15 : 12}
        popoverId="hr-help-widget"
        className={`w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[20px] border-slate-200 p-0 shadow-[0_20px_52px_rgba(15,23,42,.24)] ${isConversationView ? 'dark:border-slate-200' : 'dark:border-zinc-800'}`}
      >
        <div className={`bg-[#103f35] px-[22px] pt-[22px] text-emerald-50 ${isConversationView ? 'pb-[12px] dark:bg-[#103f35]' : 'pb-[26px] dark:bg-emerald-950'}`}>
          <div className="flex items-center justify-between gap-4">
            <Image src="/brand/hrive-wordmark-transparent.png" alt="hrive" width={84} height={25} className="h-auto w-[84px]" />
            <button type="button" onClick={() => handleOpenChange(false)} className="grid h-8 w-8 place-items-center rounded-full text-emerald-100/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200" aria-label={t('common.close', 'Close')}>
              <X className="!h-[20px] !w-[20px]" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <p className={`${isConversationView ? 'mt-[18px]' : 'mt-6'} text-xs font-bold uppercase tracking-[0.17em] text-[#68c59d]`}>{t('serviceDesk.peopleTeam', 'People team')}</p>
          <h2 className="mt-2 text-[24px] font-semibold leading-[1.12] tracking-[-0.035em] text-white">{t('serviceDesk.widget.title', 'Talk with HR')}</h2>
          {!isConversationView && <p className="mt-2 text-[14px] leading-6 text-emerald-50/80">{t('serviceDesk.widget.intro', "We're here to help. Choose a topic to get started.")}</p>}
        </div>

        {created ? (
          <div className="px-5 py-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold">{t('serviceDesk.widget.sentTitle', 'Message sent to HR')}</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {created.requestNumber
                ? t('serviceDesk.widget.sentNumber', 'Your private conversation is {number}.').replace('{number}', created.requestNumber)
                : t('serviceDesk.widget.sentBody', 'Your private conversation is now in the Service Desk.')}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button type="button" onClick={resetConversation} className="rounded-lg px-3 py-2 text-sm font-medium text-[#28715e] hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                {t('serviceDesk.widget.another', 'Send another')}
              </button>
              <Link href={serviceDeskHref} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#28715e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#205d4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                {t('serviceDesk.widget.viewConversation', 'View conversation')}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : !chatStarted ? (
          <div className="bg-white dark:bg-zinc-900">
            <div className="px-[22px] py-[24px]">
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-zinc-100">
                {t('serviceDesk.widget.chooseTopic', 'Choose a topic to start')}
              </h3>
              <p className="mt-2 text-[14px] leading-5 text-slate-500 dark:text-zinc-400">
                {t('serviceDesk.widget.chooseTopicHint', 'This only routes your chat. Nothing is sent until you write a message.')}
              </p>
            </div>

            {categories.length === 0 ? (
              <div className="mx-7 mb-7 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-zinc-700">
                <MessageCircle className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">{t('serviceDesk.widget.noTopics', 'Chat is unavailable right now')}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('serviceDesk.widget.noTopicsHint', 'Ask an administrator to configure an active HR category.')}</p>
              </div>
            ) : (
            <div className="max-h-[190px] overflow-y-auto px-[22px]" aria-label={t('serviceDesk.widget.topic', 'What is this about?')}>
                {categories.map(option => {
                  const CategoryIcon = getCategoryIcon(option.key);
                  return (
                    <button key={option.key} type="button" onClick={() => startChat(option.key)} className="group flex min-h-[62px] w-full items-center gap-3 border-b border-slate-200 text-left transition-colors last:border-b-0 hover:bg-[#f4f8f6] focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 dark:border-zinc-700 dark:hover:bg-emerald-950/30">
                      <CategoryIcon className="!h-[22px] !w-[22px] shrink-0 text-slate-900 dark:text-zinc-100" strokeWidth={1.75} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em] text-slate-900 dark:text-zinc-100">{t(`serviceDesk.category.${option.key}`, option.label)}</span>
                      <ChevronRight className="!h-[18px] !w-[18px] shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#28715e] rtl:rotate-180 rtl:group-hover:-translate-x-0.5" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-1 border-t border-slate-200 px-[22px] py-[16px] dark:border-zinc-700">
              <Link href="/service-desk" onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2d68d8] hover:text-[#174fae] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300">
                {t('serviceDesk.widget.openDesk', 'View past conversations')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="bg-white">
            <div className="flex h-[52px] items-center border-b border-slate-200 px-[20px]">
              <button type="button" onClick={returnToCategories} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={t('serviceDesk.widget.changeTopic', 'Change topic')}>
                <ArrowLeft className="!h-[18px] !w-[18px] rtl:rotate-180" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <SelectedCategoryIcon className="ml-5 !h-[19px] !w-[19px] shrink-0 text-slate-800" strokeWidth={1.75} aria-hidden="true" />
              <p className="ml-2.5 min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-900">
                {selectedCategory ? t(`serviceDesk.category.${selectedCategory.key}`, selectedCategory.label) : category}
              </p>
              <span aria-hidden="true" className="mx-4 h-[24px] w-px bg-slate-200" />
              <button type="button" onClick={returnToCategories} className="shrink-0 text-[14px] font-medium text-[#1769e0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {t('serviceDesk.widget.changeTopic', 'Change topic')}
              </button>
            </div>

            <div className="flex h-[320px] flex-col bg-white">
            {humanRequested ? (
              <div className="mx-[20px] mt-[20px] max-w-[292px] rounded-[12px] bg-slate-100 px-[16px] py-[14px] text-[14px] leading-[21px] text-slate-600">
                {t('serviceDesk.widget.privateWelcome', 'You’re starting a private conversation with the People Team.')}
              </div>
            ) : (
              <div className="mx-[20px] mt-[20px] max-w-[304px] rounded-[12px] bg-slate-100 px-[16px] py-[14px] text-[14px] leading-[21px] text-slate-600">
                {t('serviceDesk.widget.aiWelcome', `Ask a question about ${selectedCategory.label}. Answers use only this topic's approved knowledge base.`)}
              </div>
            )}

              <div className="flex-1 overflow-y-auto px-[20px] py-4">
                <div className="space-y-3">
                  {chatMessages.map((item, index) => <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'ml-auto max-w-[82%]' : 'max-w-[88%]'}>
                    <div className={cn('rounded-[12px] px-[14px] py-[10px] text-[14px] leading-5', item.role === 'user' ? 'bg-[#28715e] text-white' : 'bg-slate-100 text-slate-700')}>{item.content}</div>
                    {item.citations?.length ? <p className="mt-1 px-1 text-[11px] text-slate-500">Sources: {item.citations.join(', ')}</p> : null}
                  </div>)}
                </div>
              </div>

              {error && <p id="hr-help-message-error" role="alert" className="mx-[20px] mb-[8px] text-[12px] leading-5 text-red-700">{error}</p>}
              <div className="mx-[20px] mb-[4px] rounded-[12px] border border-slate-300 bg-white px-[14px] pb-[12px] pt-[11px]">
                <div className="flex items-start gap-[12px]">
                  <textarea
                    id="hr-help-message"
                    value={message}
                    onChange={event => {
                      setMessage(event.target.value);
                      if (error) setError('');
                    }}
                    maxLength={500}
                    disabled={sending}
                    autoFocus
                    aria-label={t('serviceDesk.widget.message', 'Your message')}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'hr-help-message-error' : 'hr-help-message-private'}
                    placeholder={humanRequested ? t('serviceDesk.widget.placeholder', 'Tell HR what you need help with...') : t('serviceDesk.widget.aiPlaceholder', 'Ask a question about this topic...')}
                    className="min-h-[34px] flex-1 resize-none border-0 bg-transparent p-0 text-[14px] leading-5 text-slate-900 outline-none placeholder:text-slate-500"
                  />
                  <span className="mt-[3px] shrink-0 text-[12px] text-slate-500">{message.length}/500</span>
                  <button
                    type="submit"
                    disabled={sending || categories.length === 0}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#28715e] text-white transition-colors hover:bg-[#205d4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={sending ? t('serviceDesk.widget.sending', 'Sending...') : t('serviceDesk.widget.send', 'Send')}
                  >
                    {sending ? <Loader2 className="!h-[18px] !w-[18px] animate-spin" aria-hidden="true" /> : <ArrowRight className="!h-[18px] !w-[18px]" strokeWidth={2} aria-hidden="true" />}
                  </button>
                </div>
                <div id="hr-help-message-private" className="mt-[10px] flex items-center gap-[9px] border-t border-slate-200 pt-[11px] text-[12px] text-slate-500">
                  <LockKeyhole className="!h-[16px] !w-[16px] shrink-0 text-slate-500" strokeWidth={1.8} aria-hidden="true" />
                  {humanRequested ? t('serviceDesk.widget.private', 'Private to you and authorized HR staff') : t('serviceDesk.widget.aiGrounded', 'AI answers use this category’s approved knowledge base')}
                </div>
              </div>
            </div>

            <div className="flex h-[72px] items-center justify-between gap-4 border-t border-slate-200 px-[22px]">
              <Link href={pathname === '/service-desk' ? '/service-desk?new=request' : '/service-desk'} onClick={() => setOpen(false)} className="text-[14px] font-semibold text-[#1769e0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {t('serviceDesk.widget.openDesk', 'View past conversations')}
              </Link>
              <button
                type="button"
                disabled={sending}
                onClick={() => { void switchToHumanFromMessage(); }}
                className="text-[14px] font-semibold text-[#1769e0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default disabled:text-slate-500 disabled:no-underline"
              >
                {t('serviceDesk.widget.talkHuman', 'Talk with a human')}
              </button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}

function getCategoryIcon(key: string): typeof BadgeDollarSign {
  if (/pay|benefit|compensation|salary/.test(key)) return BadgeDollarSign;
  if (/leave|time|holiday|absence/.test(key)) return CalendarDays;
  if (/document|letter|certificate|policy/.test(key)) return FileText;
  if (/workplace|relation|concern|conduct|grievance/.test(key)) return HeartHandshake;
  if (/account|access/.test(key)) return UserRound;
  if (/technical|system|password/.test(key)) return KeyRound;
  return Ellipsis;
}
