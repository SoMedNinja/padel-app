export type PermissionGuideEntryPoint = "install_prompt" | "version_banner" | "menu" | "settings";

type PermissionGuideOpenPayload = {
  source: PermissionGuideEntryPoint;
};

type PermissionGuideStepKey = "install" | "notifications" | "background_refresh";

type StepMetric = {
  attempts: number;
  completions: number;
};

export type PermissionGuideMetrics = Record<PermissionGuideStepKey, StepMetric>;

const OPEN_EVENT_NAME = "padel:permissions-guide-open";
const METRICS_STORAGE_KEY = "padel:permissions-guide-metrics:v1";

const EMPTY_METRICS: PermissionGuideMetrics = {
  install: { attempts: 0, completions: 0 },
  notifications: { attempts: 0, completions: 0 },
  background_refresh: { attempts: 0, completions: 0 },
};

function isStepKey(value: string): value is PermissionGuideStepKey {
  return value === "install" || value === "notifications" || value === "background_refresh";
}

export function requestOpenPermissionGuide(source: PermissionGuideEntryPoint): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PermissionGuideOpenPayload>(OPEN_EVENT_NAME, { detail: { source } }));
}

export function subscribePermissionGuideOpen(
  handler: (payload: PermissionGuideOpenPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<PermissionGuideOpenPayload>;
    if (!customEvent.detail) return;
    handler(customEvent.detail);
  };

  window.addEventListener(OPEN_EVENT_NAME, listener);
  return () => window.removeEventListener(OPEN_EVENT_NAME, listener);
}

export function loadPermissionGuideMetrics(): PermissionGuideMetrics {
  if (typeof window === "undefined") return EMPTY_METRICS;

  try {
    const raw = window.localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return EMPTY_METRICS;
    const parsed = JSON.parse(raw) as Record<string, Partial<StepMetric>>;

    return {
      install: {
        attempts: Number(parsed.install?.attempts ?? 0),
        completions: Number(parsed.install?.completions ?? 0),
      },
      notifications: {
        attempts: Number(parsed.notifications?.attempts ?? 0),
        completions: Number(parsed.notifications?.completions ?? 0),
      },
      background_refresh: {
        attempts: Number(parsed.background_refresh?.attempts ?? 0),
        completions: Number(parsed.background_refresh?.completions ?? 0),
      },
    };
  } catch {
    return EMPTY_METRICS;
  }
}

export function savePermissionGuideMetrics(metrics: PermissionGuideMetrics): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
}

// Note for non-coders:
// This local analytics helper tracks "tries" and "successes" per step so we can measure where users get stuck.
export function recordPermissionGuideMetric(
  step: PermissionGuideStepKey,
  outcome: "attempt" | "completion"
): PermissionGuideMetrics {
  const current = loadPermissionGuideMetrics();
  const next: PermissionGuideMetrics = {
    ...current,
    [step]: {
      attempts: current[step].attempts + (outcome === "attempt" ? 1 : 0),
      completions: current[step].completions + (outcome === "completion" ? 1 : 0),
    },
  };
  savePermissionGuideMetrics(next);
  return next;
}

export function readPermissionGuideStepFromCapability(capability: string): PermissionGuideStepKey | null {
  if (capability === "notifications") return "notifications";
  if (capability === "background_refresh") return "background_refresh";
  if (isStepKey(capability)) return capability;
  return null;
}
