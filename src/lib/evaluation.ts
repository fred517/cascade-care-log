import { PARAMETERS, ParameterKey, Severity } from "@/types/wastewater";

export type Reading = {
  key: ParameterKey;
  value: number | null;
};

export type Evaluation = {
  key: ParameterKey;
  severity: Severity;
  message: string;
  actions: string[];
};

function severityFor(key: ParameterKey, value: number): Severity {
  const p = PARAMETERS[key];
  const w = p.watch ?? {};
  const a = p.alarm ?? {};

  const inMin = (min?: number) => (min === undefined ? true : value >= min);
  const inMax = (max?: number) => (max === undefined ? true : value <= max);

  // Alarm first
  if (!inMin(a.min) || !inMax(a.max)) return "alarm";

  // Watch next
  if (!inMin(w.min) || !inMax(w.max)) return "watch";

  return "ok";
}

export function evaluateReadings(readings: Reading[]): Evaluation[] {
  return readings
    .filter(r => r.value !== null && Number.isFinite(r.value))
    .map(r => {
      const p = PARAMETERS[r.key];
      const value = r.value as number;
      const severity = severityFor(r.key, value);
      const label = p.label;
      const unit = p.unit ? ` ${p.unit}` : "";
      const msgBase = `${label}: ${value.toFixed(p.decimals)}${unit}`;

      if (severity === "ok") {
        return { key: r.key, severity, message: `${msgBase} (OK)`, actions: [] };
      }

      const actions = p.actions?.[severity] ?? [];
      const band =
        severity === "watch"
          ? `Watch limits ${formatBand(p.watch)}`
          : `Alarm limits ${formatBand(p.alarm)}`;

      return {
        key: r.key,
        severity,
        message: `${msgBase} (${severity.toUpperCase()})  •  ${band}`,
        actions
      };
    });
}

function formatBand(b?: { min?: number; max?: number }) {
  if (!b) return "n/a";
  const parts: string[] = [];
  if (b.min !== undefined) parts.push(`min ${b.min}`);
  if (b.max !== undefined) parts.push(`max ${b.max}`);
  return parts.length ? parts.join(", ") : "n/a";
}

// Helper to get severity color class
export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case "alarm":
      return "text-status-critical";
    case "watch":
      return "text-status-warning";
    case "ok":
      return "text-status-normal";
    default:
      return "text-muted-foreground";
  }
}

// Helper to get severity background class
export function getSeverityBgColor(severity: Severity): string {
  switch (severity) {
    case "alarm":
      return "bg-status-critical/10";
    case "watch":
      return "bg-status-warning/10";
    case "ok":
      return "bg-status-normal/10";
    default:
      return "bg-muted";
  }
}
