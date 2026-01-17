import React, { useMemo, useState } from "react";
import { PARAMETER_LIST, ParameterKey } from "@/lib/parameters";
import { evaluateReadings, Reading as EvalReading, Evaluation } from "@/lib/evaluate";
import { Reading as WastewaterReading, Threshold } from "@/types/wastewater";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ReadingFormProps {
  onSubmit: (readings: Omit<WastewaterReading, 'id'>[]) => void;
  thresholds?: Threshold[];
  onUploadFile?: (file: File) => Promise<string | null>;
}

export function ReadingForm({ onSubmit, thresholds = [], onUploadFile }: ReadingFormProps) {
  const [values, setValues] = useState<Record<ParameterKey, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of PARAMETER_LIST) init[p.key] = "";
    return init as Record<ParameterKey, string>;
  });

  // Convert to evaluation readings format
  const evalReadings: EvalReading[] = useMemo(
    () =>
      PARAMETER_LIST.map(p => ({
        key: p.key,
        value: values[p.key].trim() === "" ? null : Number(values[p.key])
      })),
    [values]
  );

  const evaluations: Evaluation[] = useMemo(() => evaluateReadings(evalReadings), [evalReadings]);
  const alarms = evaluations.filter(e => e.severity === "alarm");
  const watches = evaluations.filter(e => e.severity === "watch");

  function handleChange(key: ParameterKey, next: string) {
    // Allow empty, numbers, negative numbers, and decimal points
    if (next === '' || /^-?\d*\.?\d*$/.test(next)) {
      setValues(v => ({ ...v, [key]: next }));
    }
  }

  function submit() {
    const now = new Date();
    
    // Convert to wastewater Reading format for submission
    const readings: Omit<WastewaterReading, 'id'>[] = PARAMETER_LIST
      .filter(p => values[p.key].trim() !== "" && !isNaN(Number(values[p.key])))
      .map(p => ({
        metricId: p.key,
        value: Number(values[p.key]),
        timestamp: now,
        enteredBy: 'Current Operator',
        siteId: 'site-1',
      }));

    if (readings.length === 0) {
      toast.error('Please enter at least one reading');
      return;
    }

    // Show alerts for violations
    if (alarms.length > 0) {
      toast.error(`${alarms.length} ALARM${alarms.length > 1 ? 'S' : ''} triggered - immediate action required`);
    }
    if (watches.length > 0) {
      toast.warning(`${watches.length} parameter${watches.length > 1 ? 's' : ''} in WATCH range`);
    }

    onSubmit(readings);
    toast.success(`${readings.length} reading${readings.length > 1 ? 's' : ''} saved successfully`);

    // Reset form
    setValues(() => {
      const init: Record<string, string> = {};
      for (const p of PARAMETER_LIST) init[p.key] = "";
      return init as Record<ParameterKey, string>;
    });
  }

  return (
    <div className="grid gap-4">
      {/* Header with save button */}
      <div className="flex gap-3 items-end flex-wrap">
        <button onClick={submit} className="btn-primary">
          Save readings
        </button>
        <span className="text-sm text-muted-foreground">
          {evaluations.filter(e => e.severity !== "ok" || evalReadings.find(r => r.key === e.key)?.value !== null).length} of {PARAMETER_LIST.length} parameters entered
        </span>
      </div>

      {/* Alert Panel */}
      {(alarms.length > 0 || watches.length > 0) && (
        <AlertPanel alarms={alarms} watches={watches} />
      )}

      {/* Parameter Grid */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {PARAMETER_LIST.map(p => {
          const evaluation = evaluations.find(e => e.key === p.key);
          const severity = evaluation?.severity;
          
          return (
            <div 
              key={p.key} 
              className={cn(
                "border rounded-xl p-3 grid gap-2.5 bg-card transition-colors",
                severity === "alarm" && "border-status-critical/50 bg-status-critical/5",
                severity === "watch" && "border-status-warning/50 bg-status-warning/5",
                (!severity || severity === "ok") && "border-border"
              )}
            >
              {/* Header */}
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold text-foreground">{p.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.category} {p.unit ? `• ${p.unit}` : ""}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {p.target ? (
                    <>Target: {fmt(p.target.min)}–{fmt(p.target.max)}</>
                  ) : (
                    <>&nbsp;</>
                  )}
                </div>
              </div>

              {/* Input */}
              <input
                inputMode="decimal"
                placeholder={p.unit || "value"}
                value={values[p.key]}
                onChange={e => handleChange(p.key, e.target.value)}
                className={cn(
                  "input-field text-center font-mono",
                  severity === "alarm" && "border-status-critical ring-1 ring-status-critical/20",
                  severity === "watch" && "border-status-warning ring-1 ring-status-warning/20"
                )}
              />

              {/* Hints */}
              <div className="grid gap-1.5 text-xs text-muted-foreground">
                {p.methodHint && (
                  <div><span className="font-medium">Method:</span> {p.methodHint}</div>
                )}
                {p.samplePointHint && (
                  <div><span className="font-medium">Sample:</span> {p.samplePointHint}</div>
                )}
                <div className="flex gap-2.5 flex-wrap">
                  {p.watch && <span>Watch: {band(p.watch)}</span>}
                  {p.alarm && <span>Alarm: {band(p.alarm)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertPanel({ alarms, watches }: { alarms: Evaluation[]; watches: Evaluation[] }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      {alarms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 font-bold text-status-critical mb-2">
            <AlertCircle className="w-4 h-4" />
            Alarms ({alarms.length})
          </div>
          <ul className="space-y-2 ml-6">
            {alarms.map(a => (
              <li key={a.key} className="text-sm">
                <div className="font-semibold text-foreground">{a.message}</div>
                {a.actions.length > 0 && (
                  <ul className="list-disc ml-4 mt-1 text-muted-foreground">
                    {a.actions.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {watches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 font-bold text-status-warning mb-2">
            <AlertTriangle className="w-4 h-4" />
            Watches ({watches.length})
          </div>
          <ul className="space-y-2 ml-6">
            {watches.map(w => (
              <li key={w.key} className="text-sm">
                <div className="font-semibold text-foreground">{w.message}</div>
                {w.actions.length > 0 && (
                  <ul className="list-disc ml-4 mt-1 text-muted-foreground">
                    {w.actions.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function band(b: { min?: number; max?: number }) {
  const parts: string[] = [];
  if (b.min !== undefined) parts.push(`≥ ${b.min}`);
  if (b.max !== undefined) parts.push(`≤ ${b.max}`);
  return parts.join(" and ");
}

function fmt(n?: number) {
  if (n === undefined) return "";
  return Number.isFinite(n) ? String(n) : "";
}

export default ReadingForm;
