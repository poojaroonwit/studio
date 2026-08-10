"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import { BarChart3, BellRing, CircleOff, Loader2, Mail, Megaphone, MessageSquareText, MonitorUp, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TiptapEditor } from "@/components/ui/wysiwyg-editors";
import { SortableTableHead, type SortDirection, sortRowsByColumn, type SortValueResolverMap } from "@/components/ui/sortable-table";
import { sanitizeRichHtml } from "@/lib/security";
import { cn } from "@/lib/utils";
import { BroadcastEmailComposer } from "./BroadcastEmailComposer";
import { BannerEngagementReportDialog, type BannerReportCampaign } from "./BannerEngagementReportDialog";

export type BroadcastView = "sms" | "email" | "banner" | "popup";

type BroadcastHistoryItem = {
  campaignId: string;
  id: string;
  channel: "sms" | "email" | "banner" | "popup";
  title: string;
  audience: string;
  status: "scheduled" | "sent" | "active" | "inactive" | "failed" | "expired";
  owner: string;
  date: string;
  seenCount: number;
  acknowledgedCount: number;
};

const viewCopy = {
  sms: {
    title: "SMS Broadcasting",
    description: "Send short operational alerts to employee groups.",
  },
  email: {
    title: "Email Announcements",
    description: "Prepare richer announcements for company and HR communication.",
  },
  banner: {
    title: "Banner Setup",
    description: "Publish in-app banner messages and review banner history.",
  },
  popup: {
    title: "First-See Popup",
    description: "Set a popup announcement that appears once when users first open the app.",
  },
} satisfies Record<BroadcastView, { title: string; description: string }>;

const statusClass = {
  scheduled: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  active: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
  inactive: "border-border bg-muted text-muted-foreground",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300",
  expired: "border-border bg-muted text-muted-foreground",
};

const channelIcon = {
  sms: Smartphone,
  email: Mail,
  banner: MonitorUp,
  popup: BellRing,
};

const initialForm = {
  audience: "all-employees",
  title: "",
  subject: "",
  message: "",
  templateCode: "",
  sender: "NCC HR",
  scheduleDate: "",
  expiresDate: "",
  priority: "normal",
  placement: "top",
  backgroundColor: "#eef2ff",
  fontColor: "#312e81",
  scrollAnimation: "none",
  ctaLabel: "",
};

const audienceOptions = [
  { value: "all-employees", label: "All employees" },
  { value: "managers", label: "Managers" },
  { value: "bangkok-office", label: "Bangkok office" },
  { value: "new-hires", label: "New hires" },
  { value: "payroll-recipients", label: "Payroll recipients" },
];

function channelLabel(channel: BroadcastHistoryItem["channel"]) {
  return channel === "sms" ? "SMS" : channel;
}

export function BroadcastPage({ view }: { view: BroadcastView }) {
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reportCampaign, setReportCampaign] = useState<BannerReportCampaign | null>(null);
  const copy = viewCopy[view];

  useEffect(() => {
    let active = true;
    setIsLoadingHistory(true);
    fetch(`/api/broadcast?channel=${view}`, { credentials: "include" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Unable to load broadcasts");
        if (active) setHistory((data.campaigns || []).map(toHistoryItem));
      })
      .catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Unable to load broadcasts"); })
      .finally(() => { if (active) setIsLoadingHistory(false); });
    return () => { active = false; };
  }, [view]);

  const visibleHistory = history.filter(item => item.channel === view);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view === "email" || view === "sms") {
      setIsSubmitting(true);
      const toastId = toast.loading(`Sending ${view.toUpperCase()} broadcast...`);
      try {
        const response = await fetch(`/api/broadcast/${view}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            audience: form.audience,
            message: form.message,
            ...(view === "sms" ? { title: form.title } : {}),
            ...(view === "email" ? { subject: form.subject, templateCode: form.templateCode } : {}),
          }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof data.message === "string" ? data.message : "Broadcast failed");
        }

        if (data.campaign) setHistory(current => [toHistoryItem(data.campaign), ...current]);
        setForm(initialForm);
        setComposerOpen(false);
        toast.success(`${data.sent || 0} ${view.toUpperCase()} message${data.sent === 1 ? "" : "s"} sent`, { id: toastId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Broadcast failed", { id: toastId });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(form.scheduleDate ? "Scheduling broadcast..." : "Publishing broadcast...");
    try {
      const response = await fetch("/api/broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ channel: view, title: form.title, message: form.message, audience: form.audience,
          priority: form.priority, placement: view === "banner" ? form.placement : undefined,
          backgroundColor: view === "banner" ? form.backgroundColor : undefined,
          fontColor: view === "banner" ? form.fontColor : undefined,
          scrollAnimation: view === "banner" ? form.scrollAnimation : undefined,
          ctaLabel: view === "popup" ? form.ctaLabel : undefined,
          scheduledAt: form.scheduleDate ? new Date(`${form.scheduleDate}T00:00:00`).toISOString() : null,
          expiresAt: form.expiresDate ? new Date(`${form.expiresDate}T23:59:59`).toISOString() : null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Broadcast failed");
      setHistory(current => [toHistoryItem(data.campaign), ...current]);
      setForm(initialForm); setComposerOpen(false);
      toast.success(data.message || "Broadcast published", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Broadcast failed", { id: toastId });
    } finally { setIsSubmitting(false); }
  }

  const submitLabel = view === "email" || view === "sms"
    ? "Send broadcast"
    : view === "banner"
      ? "Publish banner"
      : "Publish popup";

  async function handleDeactivateBanner(campaignId: string) {
    const current = history.find(item => item.campaignId === campaignId);
    if (!current || (current.status !== "active" && current.status !== "scheduled")) return;

    setDeactivatingId(campaignId);
    setHistory(items => items.map(item => item.campaignId === campaignId ? { ...item, status: "inactive" } : item));
    try {
      const response = await fetch(`/api/broadcast/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "deactivate" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Unable to deactivate banner");
      toast.success("Banner deactivated");
    } catch (error) {
      setHistory(items => items.map(item => item.campaignId === campaignId ? { ...item, status: current.status } : item));
      toast.error(error instanceof Error ? error.message : "Unable to deactivate banner");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="min-h-screen w-full px-6 py-6 text-foreground">
      <div className="flex w-full flex-col gap-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Megaphone className="h-4 w-4" />
              Broadcast
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{copy.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <Button type="button" className="gap-2" onClick={() => setComposerOpen(true)}>
            <MessageSquareText className="h-4 w-4" />
            {submitLabel}
          </Button>
        </header>

        <HistoryTable
          title={view === "banner" ? "Banner history" : "Broadcast history"}
          history={visibleHistory}
          isLoading={isLoadingHistory}
          allowDeactivate={view === "banner"}
          deactivatingId={deactivatingId}
          onDeactivate={handleDeactivateBanner}
          onReport={(campaign) => setReportCampaign(campaign)}
        />

        <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
            <DialogContent className={cn(
              "max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[8px]",
              view === "email" ? "sm:max-w-5xl" : "sm:max-w-xl",
            )}>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                    {viewCopy[view].title}
                  </DialogTitle>
                  <DialogDescription>
                    Create a new {channelLabel(view)} message. It will appear in the history after submission.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-5">
                  <ComposerFields view={view} form={form} setForm={setForm} onPreviewPopup={() => setPopupOpen(true)} />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setComposerOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {submitLabel}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>

        <FirstSeePopupPreview open={popupOpen} onOpenChange={setPopupOpen} form={form} />
        <BannerEngagementReportDialog campaign={reportCampaign} onOpenChange={(open) => !open && setReportCampaign(null)} />
      </div>
    </div>
  );
}

function ComposerFields({
  view,
  form,
  setForm,
  onPreviewPopup,
}: {
  view: BroadcastView;
  form: typeof initialForm;
  setForm: Dispatch<SetStateAction<typeof initialForm>>;
  onPreviewPopup: () => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">
        Audience
        <select
          value={form.audience}
          onChange={(event) => setForm(current => ({ ...current, audience: event.target.value }))}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
        >
          {audienceOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      {view !== "email" && (
        <label className="grid gap-1 text-sm font-medium">
          Title
          <Input value={form.title} onChange={(event) => setForm(current => ({ ...current, title: event.target.value }))} placeholder={view === "sms" ? "Office alert" : "Announcement title"} required />
        </label>
      )}

      {view === "banner" && (
        <label className="grid gap-1 text-sm font-medium">
          Placement
          <select
            value={form.placement}
            onChange={(event) => setForm(current => ({ ...current, placement: event.target.value }))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          >
            <option value="top">Top banner</option>
            <option value="dashboard">Dashboard banner</option>
            <option value="ess">ESS banner</option>
          </select>
        </label>
      )}

      {view === "email" ? (
        <BroadcastEmailComposer form={form} setForm={setForm} />
      ) : view === "banner" ? (
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="banner-message-editor">Message</label>
          <TiptapEditor
            value={form.message}
            onChange={(message) => setForm(current => ({ ...current, message }))}
            placeholder="Write and format the banner announcement..."
            className="min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground">Use the toolbar to format emphasis, links, lists, and headings.</p>
        </div>
      ) : (
        <label className="grid gap-1 text-sm font-medium">
          Message
          <Textarea
            value={form.message}
            onChange={(event) => setForm(current => ({ ...current, message: event.target.value }))}
            placeholder="Write the announcement..."
            rows={view === "sms" ? 4 : 6}
            maxLength={view === "sms" ? 320 : undefined}
            required
          />
        </label>
      )}

      {view === "banner" && (
        <div className="grid gap-4 rounded-[8px] border border-border bg-muted/70 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="banner-background-color"
              label="Background color"
              value={form.backgroundColor}
              onChange={(backgroundColor) => setForm(current => ({ ...current, backgroundColor }))}
            />
            <ColorField
              id="banner-font-color"
              label="Font color"
              value={form.fontColor}
              onChange={(fontColor) => setForm(current => ({ ...current, fontColor }))}
            />
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Scroll animation
            <select
              value={form.scrollAnimation}
              onChange={(event) => setForm(current => ({ ...current, scrollAnimation: event.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            >
              <option value="none">Off</option>
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </label>

          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Live preview</span>
            <BannerContent
              title={form.title || "Announcement"}
              message={form.message}
              backgroundColor={form.backgroundColor}
              fontColor={form.fontColor}
              scrollAnimation={form.scrollAnimation}
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(view === "banner" || view === "popup") && <label className="grid gap-1 text-sm font-medium">
          Publish date
          <Input type="date" value={form.scheduleDate} onChange={(event) => setForm(current => ({ ...current, scheduleDate: event.target.value }))} />
        </label>}
        {(view === "banner" || view === "popup") && <label className="grid gap-1 text-sm font-medium">
          Priority
          <select
            value={form.priority}
            onChange={(event) => setForm(current => ({ ...current, priority: event.target.value }))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>}
      </div>

      {(view === "banner" || view === "popup") && <label className="grid gap-1 text-sm font-medium">
        Expiry date (optional)
        <Input type="date" value={form.expiresDate} onChange={(event) => setForm(current => ({ ...current, expiresDate: event.target.value }))} />
      </label>}

      {view === "popup" && (
        <div className="rounded-[8px] border border-border bg-muted/70 p-3">
          <label className="grid gap-1 text-sm font-medium">
            CTA label
            <Input value={form.ctaLabel} onChange={(event) => setForm(current => ({ ...current, ctaLabel: event.target.value }))} placeholder="Open ESS" />
          </label>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onPreviewPopup}>Preview popup</Button>
        </div>
      )}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium" htmlFor={id}>
      {label}
      <span className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
        <input
          id={id}
          type="color"
          value={validHexColor(value, "#000000")}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          aria-label={`${label} hex value`}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
        />
      </span>
    </label>
  );
}

function BannerContent({
  title,
  message,
  backgroundColor,
  fontColor,
  scrollAnimation,
}: {
  title: string;
  message: string;
  backgroundColor: string;
  fontColor: string;
  scrollAnimation: string;
}) {
  const animated = scrollAnimation !== "none";
  const content = (
    <div className="broadcast-banner-copy flex shrink-0 items-center gap-2 px-4">
      <span className="font-semibold">{title}</span>
      <div
        className="broadcast-banner-rich-text"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(message || "<p>Your formatted announcement appears here.</p>") }}
      />
    </div>
  );

  return (
    <div
      className="broadcast-banner-surface overflow-hidden border-y py-2 text-sm"
      style={{ backgroundColor: validHexColor(backgroundColor, "#eef2ff"), color: validHexColor(fontColor, "#312e81") }}
    >
      <div className={cn("flex w-max min-w-full items-center", animated && "broadcast-banner-marquee")} data-speed={scrollAnimation}>
        {content}
        {animated && <div aria-hidden="true">{content}</div>}
      </div>
    </div>
  );
}

function validHexColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function getAudienceLabel(value: string) {
  return audienceOptions.find((option) => option.value === value)?.label || value;
}

function HistoryTable({
  title,
  history,
  isLoading,
  allowDeactivate,
  deactivatingId,
  onDeactivate,
  onReport,
}: {
  title: string;
  history: BroadcastHistoryItem[];
  isLoading: boolean;
  allowDeactivate: boolean;
  deactivatingId: string | null;
  onDeactivate: (campaignId: string) => void;
  onReport: (campaign: BannerReportCampaign) => void;
}) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const sortValueResolvers: SortValueResolverMap<BroadcastHistoryItem> = {
    ticket: (item) => item.id,
    channel: (item) => item.channel,
    title: (item) => item.title,
    audience: (item) => item.audience,
    status: (item) => item.status,
    seen: (item) => item.seenCount,
    acknowledged: (item) => item.acknowledgedCount,
    owner: (item) => item.owner,
    date: (item) => item.date,
  };
  const sortedHistory = sortRowsByColumn(history, sortColumn, sortDirection, sortValueResolvers);
  const handleSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const columnCount = allowDeactivate ? 10 : 7;

  return (
    <section className="rounded-[8px] border border-border bg-card shadow-sm dark:shadow-none">
      <div className="border-b border-border p-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead column="ticket" label="Ticket" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableTableHead column="channel" label="Channel" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableTableHead column="title" label="Title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableTableHead column="audience" label="Audience" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableTableHead column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              {allowDeactivate && <SortableTableHead className="text-right" column="seen" label="Seen" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />}
              {allowDeactivate && <SortableTableHead className="text-right" column="acknowledged" label="Acknowledged" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />}
              <SortableTableHead column="owner" label="Owner" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableTableHead column="date" label="Date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              {allowDeactivate && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columnCount} className="h-28 text-center text-sm text-muted-foreground">Loading broadcast history…</TableCell></TableRow>
            ) : sortedHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-28 text-center text-sm text-muted-foreground">No broadcast history yet.</TableCell>
              </TableRow>
            ) : sortedHistory.map(item => {
              const Icon = channelIcon[item.channel];
              return (
                <TableRow key={item.campaignId}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 capitalize">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {channelLabel(item.channel)}
                    </span>
                  </TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.audience}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", statusClass[item.status])}>{item.status}</Badge>
                  </TableCell>
                  {allowDeactivate && <TableCell className="text-right font-medium tabular-nums">{item.seenCount.toLocaleString()}</TableCell>}
                  {allowDeactivate && <TableCell className="text-right font-medium tabular-nums">{item.acknowledgedCount.toLocaleString()}</TableCell>}
                  <TableCell>{item.owner}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  {allowDeactivate && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => onReport({ id: item.campaignId, title: item.title })}
                        >
                          <BarChart3 />
                          Report
                        </Button>
                        {(item.status === "active" || item.status === "scheduled" || deactivatingId === item.campaignId) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border text-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-800 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                          disabled={deactivatingId !== null}
                          onClick={() => onDeactivate(item.campaignId)}
                          aria-label={`Deactivate ${item.title}`}
                        >
                          {deactivatingId === item.campaignId ? <Loader2 className="animate-spin" /> : <CircleOff />}
                          {deactivatingId === item.campaignId ? "Deactivating" : "Deactivate"}
                        </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function toHistoryItem(campaign: Record<string, unknown>): BroadcastHistoryItem {
  return {
    campaignId: String(campaign.id),
    id: String(campaign.id).slice(0, 8).toUpperCase(),
    channel: campaign.channel as BroadcastHistoryItem["channel"],
    title: String(campaign.title || "Untitled"),
    audience: getAudienceLabel(String(campaign.audience || "all-employees")),
    status: campaign.status as BroadcastHistoryItem["status"],
    owner: String(campaign.owner || "Unknown user"),
    date: new Date(String(campaign.scheduledAt || campaign.createdAt)).toLocaleDateString(),
    seenCount: Number(campaign.seenCount || 0),
    acknowledgedCount: Number(campaign.acknowledgedCount || 0),
  };
}

function FirstSeePopupPreview({
  open,
  onOpenChange,
  form,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: typeof initialForm;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[8px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.title || "Welcome announcement"}</DialogTitle>
          <DialogDescription>{form.audience}</DialogDescription>
        </DialogHeader>
        <div className="rounded-[8px] border border-border bg-muted p-4 text-sm leading-6 text-foreground">
          {form.message || "A first-see popup will show once for each user when they open the app."}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Dismiss</Button>
          <Button type="button" onClick={() => onOpenChange(false)}>{form.ctaLabel || "Got it"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
