// src/lib/safe-fetch.ts
// Safe fetch helpers that never block the UI: per-request timeout and allSettled combinator

export type SafeFetchInit = RequestInit & { timeoutMs?: number };

export async function fetchWithTimeout(input: RequestInfo | URL, init: SafeFetchInit = {}) {
  const { timeoutMs = 5000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...rest, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function safeJson<T = unknown>(input: RequestInfo | URL, init: SafeFetchInit = {}): Promise<{ ok: boolean; data?: T; status?: number; error?: string }> {
  try {
    const res = await fetchWithTimeout(input, init);
    const status = res.status;
    if (!res.ok) {
      return { ok: false, status, error: res.statusText || `HTTP ${status}` };
    }
    // Best-effort JSON parse; if not JSON, return ok=false
    try {
      const json = (await res.json()) as T;
      return { ok: true, data: json, status };
    } catch (e: any) {
      return { ok: false, status, error: 'Invalid JSON' };
    }
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'network error');
    return { ok: false, error: msg };
  }
}

export async function allSettledWithTimeout<T>(promises: Array<Promise<T>>, timeoutMs: number): Promise<PromiseSettledResult<T>[]> {
  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      clearTimeout(t as any);
      reject(new Error('batch timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.allSettled(promises),
      timeout,
    ]) as PromiseSettledResult<T>[];
  } catch {
    // On batch timeout, mark all as rejected generically
    return promises.map(() => ({ status: 'rejected', reason: new Error('batch timeout') })) as PromiseSettledResult<T>[];
  }
}


