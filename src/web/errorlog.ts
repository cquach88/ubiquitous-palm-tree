/**
 * Client-side error logging and one-click bug reports.
 *
 * Every uncaught error (and every engine rejection of a local action) is
 * recorded to a small ring buffer in localStorage together with the game
 * context needed to reproduce it: seed, dealer, and the full action history
 * in the compact encoding from src/core/replay.ts.
 *
 * "Send report" opens a prefilled GitHub issue whose body contains the
 * report as a fenced ```json block. That issue is the machine-readable
 * inbox: tooling (or Claude Code) extracts the JSON and replays it with
 *   REPLAY_REPORT=report.json npm test -- replay
 * to reproduce the failure deterministically.
 */

export interface ErrorEntry {
  time: string;
  /** Where it was caught: 'action' | 'window' | 'promise'. */
  kind: string;
  message: string;
  stack?: string;
  /** Encoded action that the engine rejected, if applicable. */
  action?: string;
  phase?: string;
}

export interface ReportContext {
  mode: string;
  locale: string;
  seed: number;
  dealer: number;
  /** Encoded action history (see src/core/replay.ts). */
  actions: string;
  /** False when the tab restored mid-game and history is partial. */
  historyComplete: boolean;
  phase: string;
}

export interface Report extends ReportContext {
  app: string;
  version: string;
  time: string;
  url: string;
  userAgent: string;
  errors: ErrorEntry[];
}

const STORAGE_KEY = 'tusac-errors';
const MAX_ENTRIES = 20;
const ISSUES_URL = 'https://github.com/cquach88/ubiquitous-palm-tree/issues/new';
/** Keep prefilled-issue URLs comfortably under browser/GitHub limits. */
const MAX_BODY_CHARS = 6000;

declare const __APP_VERSION__: string;

function appVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
}

export function loadErrors(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr as ErrorEntry[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveErrors(entries: ErrorEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore */
  }
}

export function clearErrors(): void {
  saveErrors([]);
}

export function recordError(
  kind: string,
  error: unknown,
  extra: Partial<ErrorEntry> = {},
): ErrorEntry {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry: ErrorEntry = {
    time: new Date().toISOString(),
    kind,
    message: err.message.slice(0, 300),
    stack: err.stack?.slice(0, 900),
    ...extra,
  };
  const entries = loadErrors();
  entries.push(entry);
  saveErrors(entries);
  return entry;
}

export function buildReport(ctx: ReportContext): Report {
  return {
    app: 'tu-sac',
    version: appVersion(),
    time: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    ...ctx,
    errors: loadErrors(),
  };
}

export function reportJSON(ctx: ReportContext): string {
  return JSON.stringify(buildReport(ctx), null, 2);
}

/** Prefilled new-issue URL. Trims stacks/old errors to fit URL limits. */
export function issueURL(ctx: ReportContext): string {
  const report = buildReport(ctx);
  const lastMessage = report.errors[report.errors.length - 1]?.message ?? 'manual report';
  const title = `[bug report] ${lastMessage.slice(0, 80)}`;

  const render = (r: Report) =>
    [
      'Automated in-game bug report. The JSON below is machine-readable —',
      'replay it with: `REPLAY_REPORT=report.json npm test -- replay`',
      '',
      '```json',
      JSON.stringify(r, null, 1),
      '```',
    ].join('\n');

  let body = render(report);
  if (body.length > MAX_BODY_CHARS) {
    // Stacks first, then older errors — the action history is the most
    // valuable part, keep it as long as possible.
    report.errors = report.errors.map((e) => ({ ...e, stack: undefined }));
    body = render(report);
  }
  while (body.length > MAX_BODY_CHARS && report.errors.length > 1) {
    report.errors.shift();
    body = render(report);
  }
  if (body.length > MAX_BODY_CHARS) {
    report.actions = `${report.actions.slice(0, MAX_BODY_CHARS - 1200)}…(truncated)`;
    body = render(report);
  }
  return `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** Catch errors that escape the app's own try/catch layers. */
export function installGlobalHandlers(onRecorded: () => void, phase: () => string): void {
  window.addEventListener('error', (ev) => {
    recordError('window', ev.error ?? ev.message, { phase: phase() });
    onRecorded();
  });
  window.addEventListener('unhandledrejection', (ev) => {
    recordError('promise', ev.reason, { phase: phase() });
    onRecorded();
  });
}
