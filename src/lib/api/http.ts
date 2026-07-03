/**
 * Unified upstream HTTP client.
 * - Per-attempt timeout via AbortController.
 * - Retry with exponential backoff + full jitter (network/timeout/5xx/429 only).
 * - Simple in-memory circuit breaker per hostname.
 * - Optional per-host outbound rate limiting (serial queue with min interval).
 */

export class UpstreamError extends Error {
  constructor(public url: string, public status: number, message?: string) {
    super(message ?? `${status} from ${new URL(url).hostname}`);
    this.name = "UpstreamError";
  }
}

export class CircuitOpenError extends Error {
  constructor(public host: string) {
    super(`Circuit open: ${host}`);
    this.name = "CircuitOpenError";
  }
}

// ---------------------------------------------------------------------------
// Circuit breaker (per warm instance — enough to stop hammering a dead host).
// ---------------------------------------------------------------------------
interface BreakerState { failures: number; openedAt: number }

const BREAKER_THRESHOLD = 4;
const BREAKER_COOLDOWN_MS = 30_000;
const breakers = new Map<string, BreakerState>();

function canRequest(host: string) {
  const state = breakers.get(host);
  if (!state || state.failures < BREAKER_THRESHOLD) return true;
  return Date.now() - state.openedAt >= BREAKER_COOLDOWN_MS; // half-open probe
}

function recordSuccess(host: string) {
  breakers.delete(host);
}

function recordFailure(host: string) {
  const state = breakers.get(host) ?? { failures: 0, openedAt: 0 };
  state.failures += 1;
  if (state.failures >= BREAKER_THRESHOLD) state.openedAt = Date.now();
  breakers.set(host, state);
}

export function breakerSnapshot() {
  return Array.from(breakers.entries()).map(([host, state]) => ({
    host,
    failures: state.failures,
    open: state.failures >= BREAKER_THRESHOLD && Date.now() - state.openedAt < BREAKER_COOLDOWN_MS,
  }));
}

// ---------------------------------------------------------------------------
// Outbound rate limiter: serial promise chain with minimum interval per host.
// Used for public APIs with strict limits (Jikan: 3 req/s → 400ms interval).
// ---------------------------------------------------------------------------
const hostChains = new Map<string, { chain: Promise<unknown>; lastRun: number }>();

function throttled<T>(host: string, minIntervalMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = hostChains.get(host) ?? { chain: Promise.resolve(), lastRun: 0 };
  const task = entry.chain.then(async () => {
    const wait = entry.lastRun + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    entry.lastRun = Date.now();
    return fn();
  });
  entry.chain = task.catch(() => {});
  hostChains.set(host, entry);
  return task;
}

// ---------------------------------------------------------------------------
// Fetch with retry.
// ---------------------------------------------------------------------------
export interface ApiFetchOptions extends RequestInit {
  /** Per-attempt timeout in ms. Default 10s. */
  timeoutMs?: number;
  /** Extra retry attempts after the first try. Default 1. */
  retries?: number;
  /** Backoff base delay in ms. Default 350. */
  baseDelayMs?: number;
  /** Minimum interval between requests to this host (rate limit). */
  minIntervalMs?: number;
  next?: { revalidate?: number | false; tags?: string[] };
}

const isRetryableStatus = (status: number) => status >= 500 || status === 429;

const fullJitter = (base: number, attempt: number) =>
  Math.random() * Math.min(8_000, base * 2 ** attempt);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function attemptFetch(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10_000, retries = 1, baseDelayMs = 350, minIntervalMs, ...init } = options;
  const host = new URL(url).hostname;

  if (!canRequest(host)) throw new CircuitOpenError(host);

  const run = async (): Promise<Response> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const res = await attemptFetch(url, init, timeoutMs);
        if (res.ok) {
          recordSuccess(host);
          return res;
        }
        if (!isRetryableStatus(res.status) || attempt === retries) {
          // 4xx = deterministic, not a host-health signal.
          if (res.status >= 500) recordFailure(host);
          throw new UpstreamError(url, res.status, `${res.status} ${res.statusText}`);
        }
        const retryAfter = Number(res.headers.get("retry-after")) * 1000 || 0;
        await sleep(Math.max(retryAfter, fullJitter(baseDelayMs, attempt)));
      } catch (error) {
        if (error instanceof UpstreamError) throw error;
        lastError = error;
        if (attempt === retries) break;
        await sleep(fullJitter(baseDelayMs, attempt));
      }
    }
    recordFailure(host);
    throw lastError instanceof Error ? lastError : new Error(`Upstream request failed: ${host}`);
  };

  return minIntervalMs ? throttled(host, minIntervalMs, run) : run();
}

/** apiFetch + JSON parse with a readable error preview for HTML error pages. */
export async function apiFetchJson<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    throw new UpstreamError(url, res.status, preview || "Invalid JSON response");
  }
}
