"use client";

import * as React from "react";

import {
  parseLeaveAllocationDraftRun,
  type LeaveAllocationDraftState,
} from "@/lib/hr/leave-allocation-draft";

type DraftSaveInput = Omit<LeaveAllocationDraftState, "id" | "savedAt">;

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function useLeaveAllocationDraft(enabled = true) {
  const [draft, setDraft] = React.useState<LeaveAllocationDraftState | null>(null);
  const [loading, setLoading] = React.useState(enabled);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    if (!enabled) {
      setDraft(null);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/hr/leaves/allocation-draft", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          errorMessage(payload, "Unable to load the allocation draft."),
        );
      }
      setDraft(parseLeaveAllocationDraftRun(payload?.data));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the allocation draft.",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = React.useCallback(async (input: DraftSaveInput) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/hr/leaves/allocation-draft", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          errorMessage(payload, "Unable to save the allocation draft."),
        );
      }
      const next = parseLeaveAllocationDraftRun(payload?.data);
      setDraft(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, []);

  const remove = React.useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/hr/leaves/allocation-draft", {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          errorMessage(payload, "Unable to remove the allocation draft."),
        );
      }
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }, []);

  const clear = React.useCallback(() => {
    setDraft(null);
    setError("");
  }, []);

  return { draft, loading, saving, error, load, save, remove, clear };
}
