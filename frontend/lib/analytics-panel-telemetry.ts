type AnalyticsPanelName = "summary" | "trend" | "status" | "paths";

type AnalyticsTelemetryState = {
  updatedAt: string;
  counters: Record<string, number>;
};

const STORAGE_KEY = "dashboard_analytics_telemetry_v1";

function loadState(): AnalyticsTelemetryState {
  if (typeof window === "undefined") {
    return { updatedAt: new Date().toISOString(), counters: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { updatedAt: new Date().toISOString(), counters: {} };
    }
    const parsed = JSON.parse(raw) as AnalyticsTelemetryState;
    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      counters: parsed.counters || {},
    };
  } catch {
    return { updatedAt: new Date().toISOString(), counters: {} };
  }
}

function saveState(state: AnalyticsTelemetryState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function incrementCounter(counterKey: string): number {
  const state = loadState();
  const current = state.counters[counterKey] || 0;
  const next = current + 1;
  state.counters[counterKey] = next;
  state.updatedAt = new Date().toISOString();
  saveState(state);
  return next;
}

function panelCounterKey(panel: AnalyticsPanelName, action: "error" | "retry"): string {
  return `analytics_panel_${panel}_${action}`;
}

export function trackAnalyticsPanelError(
  panel: AnalyticsPanelName,
  context?: { windowDays?: number; granularity?: "hour" | "day" },
): void {
  const value = incrementCounter(panelCounterKey(panel, "error"));
  console.info("[analytics-telemetry] panel error", {
    panel,
    count: value,
    ...context,
  });
}

export function trackAnalyticsPanelRetry(
  panel: AnalyticsPanelName,
  context?: { windowDays?: number; granularity?: "hour" | "day" },
): void {
  const value = incrementCounter(panelCounterKey(panel, "retry"));
  console.info("[analytics-telemetry] panel retry", {
    panel,
    count: value,
    ...context,
  });
}

export function getAnalyticsTelemetryCounters(): Record<string, number> {
  return loadState().counters;
}
