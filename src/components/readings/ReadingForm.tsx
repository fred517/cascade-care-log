import React, { useMemo, useState, useRef } from "react";
import { PARAMETER_LIST, ParameterKey } from "@/lib/parameters";
import { evaluateReadings, Reading as EvalReading, Evaluation } from "@/lib/evaluate";
import { Reading as WastewaterReading, Threshold, PARAMETERS } from "@/types/wastewater";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Paperclip, X, FileText, Loader2, MessageSquare, BookOpen, ChevronDown, ChevronRight, ArrowDown, ArrowUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { usePlaybooks } from "@/hooks/usePlaybooks";

interface AttachmentInfo {
  file: File;
  preview?: string;
  url?: string;
}

interface ReadingFormProps {
  onSubmit: (readings: Omit<WastewaterReading, 'id'>[]) => void;
  thresholds?: Threshold[];
  onUploadFile?: (file: File) => Promise<string | null>;
}

export function ReadingForm({ onSubmit, thresholds = [], onUploadFile }: ReadingFormProps) {
  const { getPlaybook, loading: playbooksLoading } = usePlaybooks();
  
  const [values, setValues] = useState<Record<ParameterKey, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of PARAMETER_LIST) init[p.key] = "";
    return init as Record<ParameterKey, string>;
  });

  const [notes, setNotes] = useState<Record<ParameterKey, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of PARAMETER_LIST) init[p.key] = "";
    return init as Record<ParameterKey, string>;
  });

  const [attachments, setAttachments] = useState<Record<ParameterKey, AttachmentInfo | null>>(() => {
    const init: Record<string, AttachmentInfo | null> = {};
    for (const p of PARAMETER_LIST) init[p.key] = null;
    return init as Record<ParameterKey, AttachmentInfo | null>;
  });

  const [expandedNotes, setExpandedNotes] = useState<Set<ParameterKey>>(new Set());
  const [expandedPlaybooks, setExpandedPlaybooks] = useState<Set<string>>(new Set());
  const [uploadingMetric, setUploadingMetric] = useState<ParameterKey | null>(null);
  const fileInputRefs = useRef<Record<ParameterKey, HTMLInputElement | null>>({} as Record<ParameterKey, HTMLInputElement | null>);

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
  const enteredCount = evalReadings.filter(r => r.value !== null).length;

  // Get playbooks for breached parameters
  const getBreachPlaybooks = useMemo(() => {
    const breaches: Array<{
      key: ParameterKey;
      severity: 'alarm' | 'watch';
      condition: 'low' | 'high';
      value: number;
      playbook: any;
    }> = [];

    [...alarms, ...watches].forEach(evaluation => {
      const param = PARAMETERS[evaluation.key];
      const value = Number(values[evaluation.key]);
      
      // Determine if it's a low or high breach
      let condition: 'low' | 'high' = 'high';
      if (param.alarm?.min !== undefined && value < param.alarm.min) {
        condition = 'low';
      } else if (param.watch?.min !== undefined && value < param.watch.min) {
        condition = 'low';
      }

      const playbook = getPlaybook(evaluation.key, condition);
      if (playbook) {
        breaches.push({
          key: evaluation.key,
          severity: evaluation.severity as 'alarm' | 'watch',
          condition,
          value,
          playbook,
        });
      }
    });

    return breaches;
  }, [alarms, watches, values, getPlaybook]);

  const togglePlaybook = (key: string) => {
    setExpandedPlaybooks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  function handleChange(key: ParameterKey, next: string) {
    if (next === '' || /^-?\d*\.?\d*$/.test(next)) {
      setValues(v => ({ ...v, [key]: next }));
    }
  }

  function handleNoteChange(key: ParameterKey, note: string) {
    setNotes(prev => ({ ...prev, [key]: note }));
  }

  function toggleNotes(key: ParameterKey) {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleFileSelect(key: ParameterKey, file: File) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    let preview: string | undefined;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    if (onUploadFile) {
      setUploadingMetric(key);
      const url = await onUploadFile(file);
      setUploadingMetric(null);
      
      if (url) {
        setAttachments(prev => ({ ...prev, [key]: { file, preview, url } }));
        toast.success('File uploaded successfully');
      }
    } else {
      setAttachments(prev => ({ ...prev, [key]: { file, preview } }));
    }
  }

  function handleRemoveAttachment(key: ParameterKey) {
    const attachment = attachments[key];
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(prev => ({ ...prev, [key]: null }));
  }

  function triggerFileInput(key: ParameterKey) {
    fileInputRefs.current[key]?.click();
  }

  function submit() {
    const now = new Date();
    
    const readings: Omit<WastewaterReading, 'id'>[] = PARAMETER_LIST
      .filter(p => values[p.key].trim() !== "" && !isNaN(Number(values[p.key])))
      .map(p => ({
        metricId: p.key,
        value: Number(values[p.key]),
        timestamp: now,
        enteredBy: 'Current Operator',
        siteId: 'site-1',
        notes: notes[p.key] || undefined,
        attachmentUrl: attachments[p.key]?.url,
      }));

    if (readings.length === 0) {
      toast.error('Please enter at least one reading');
      return;
    }

    if (alarms.length > 0) {
      toast.error(`${alarms.length} ALARM${alarms.length > 1 ? 'S' : ''} triggered - immediate action required`);
    }
    if (watches.length > 0) {
      toast.warning(`${watches.length} parameter${watches.length > 1 ? 's' : ''} in WATCH range`);
    }

    onSubmit(readings);
    toast.success(`${readings.length} reading${readings.length > 1 ? 's' : ''} saved successfully`);

    // Cleanup previews
    Object.values(attachments).forEach(att => {
      if (att?.preview) URL.revokeObjectURL(att.preview);
    });

    // Reset form
    setValues(() => {
      const init: Record<string, string> = {};
      for (const p of PARAMETER_LIST) init[p.key] = "";
      return init as Record<ParameterKey, string>;
    });
    setNotes(() => {
      const init: Record<string, string> = {};
      for (const p of PARAMETER_LIST) init[p.key] = "";
      return init as Record<ParameterKey, string>;
    });
    setAttachments(() => {
      const init: Record<string, AttachmentInfo | null> = {};
      for (const p of PARAMETER_LIST) init[p.key] = null;
      return init as Record<ParameterKey, AttachmentInfo | null>;
    });
    setExpandedNotes(new Set());
  }

  return (
    <div className="grid gap-4">
      {/* Header with save button */}
      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={submit} className="btn-primary">
          Save readings
        </button>
        <span className="text-sm text-muted-foreground">
          {enteredCount} of {PARAMETER_LIST.length} parameters entered
        </span>
      </div>

      {/* Alert Panel with Playbooks */}
      {(alarms.length > 0 || watches.length > 0) && (
        <AlertPanelWithPlaybooks 
          alarms={alarms} 
          watches={watches} 
          breachPlaybooks={getBreachPlaybooks}
          expandedPlaybooks={expandedPlaybooks}
          onTogglePlaybook={togglePlaybook}
          loading={playbooksLoading}
        />
      )}

      {/* Parameter Grid */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {PARAMETER_LIST.map(p => {
          const evaluation = evaluations.find(e => e.key === p.key);
          const severity = evaluation?.severity;
          const hasValue = values[p.key].trim() !== "";
          const isExpanded = expandedNotes.has(p.key);
          const attachment = attachments[p.key];
          const isUploading = uploadingMetric === p.key;
          const hasNote = notes[p.key].trim() !== "";
          
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

              {/* Value Input Row */}
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  placeholder={p.unit || "value"}
                  value={values[p.key]}
                  onChange={e => handleChange(p.key, e.target.value)}
                  className={cn(
                    "input-field text-center font-mono flex-1",
                    severity === "alarm" && "border-status-critical ring-1 ring-status-critical/20",
                    severity === "watch" && "border-status-warning ring-1 ring-status-warning/20"
                  )}
                />
                
                {/* Notes toggle */}
                <button
                  type="button"
                  onClick={() => toggleNotes(p.key)}
                  className={cn(
                    "p-2 rounded-lg border transition-colors",
                    isExpanded || hasNote
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                  title="Add note"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                {/* Attachment button */}
                <input
                  ref={el => fileInputRefs.current[p.key] = el}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(p.key, file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => triggerFileInput(p.key)}
                  disabled={isUploading}
                  className={cn(
                    "p-2 rounded-lg border transition-colors",
                    attachment
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                    isUploading && "opacity-50 cursor-not-allowed"
                  )}
                  title="Attach file"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Notes Input (expandable) */}
              {isExpanded && (
                <textarea
                  value={notes[p.key]}
                  onChange={e => handleNoteChange(p.key, e.target.value)}
                  placeholder="Add observations..."
                  className="input-field resize-none h-16 text-sm"
                />
              )}

              {/* Attachment Preview */}
              {attachment && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  {attachment.preview ? (
                    <img 
                      src={attachment.preview} 
                      alt="Preview" 
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{attachment.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.file.size / 1024).toFixed(0)} KB
                      {attachment.url && <span className="text-status-normal ml-1">✓</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(p.key)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Threshold Hints */}
              <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                {p.watch && <span>Watch: {band(p.watch)}</span>}
                {p.alarm && <span>Alarm: {band(p.alarm)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BreachPlaybook {
  key: ParameterKey;
  severity: 'alarm' | 'watch';
  condition: 'low' | 'high';
  value: number;
  playbook: any;
}

interface AlertPanelWithPlaybooksProps {
  alarms: Evaluation[];
  watches: Evaluation[];
  breachPlaybooks: BreachPlaybook[];
  expandedPlaybooks: Set<string>;
  onTogglePlaybook: (key: string) => void;
  loading: boolean;
}

function AlertPanelWithPlaybooks({ 
  alarms, 
  watches, 
  breachPlaybooks, 
  expandedPlaybooks, 
  onTogglePlaybook,
  loading 
}: AlertPanelWithPlaybooksProps) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      {alarms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 font-bold text-status-critical mb-3">
            <AlertCircle className="w-5 h-5" />
            <span>Alarms ({alarms.length})</span>
            <span className="text-xs font-normal bg-status-critical/20 px-2 py-0.5 rounded-full">
              Immediate action required
            </span>
          </div>
          <div className="space-y-3">
            {alarms.map(a => {
              const breach = breachPlaybooks.find(b => b.key === a.key);
              const playbookKey = `${a.key}-${breach?.condition || 'high'}`;
              const isExpanded = expandedPlaybooks.has(playbookKey);
              
              return (
                <AlertItemWithPlaybook
                  key={a.key}
                  evaluation={a}
                  breach={breach}
                  isExpanded={isExpanded}
                  onToggle={() => onTogglePlaybook(playbookKey)}
                  loading={loading}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {watches.length > 0 && (
        <div className={alarms.length > 0 ? "pt-4 border-t border-border" : ""}>
          <div className="flex items-center gap-2 font-bold text-status-warning mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span>Watches ({watches.length})</span>
            <span className="text-xs font-normal bg-status-warning/20 px-2 py-0.5 rounded-full">
              Monitor closely
            </span>
          </div>
          <div className="space-y-3">
            {watches.map(w => {
              const breach = breachPlaybooks.find(b => b.key === w.key);
              const playbookKey = `${w.key}-${breach?.condition || 'high'}`;
              const isExpanded = expandedPlaybooks.has(playbookKey);
              
              return (
                <AlertItemWithPlaybook
                  key={w.key}
                  evaluation={w}
                  breach={breach}
                  isExpanded={isExpanded}
                  onToggle={() => onTogglePlaybook(playbookKey)}
                  loading={loading}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface AlertItemProps {
  evaluation: Evaluation;
  breach?: BreachPlaybook;
  isExpanded: boolean;
  onToggle: () => void;
  loading: boolean;
}

function AlertItemWithPlaybook({ evaluation, breach, isExpanded, onToggle, loading }: AlertItemProps) {
  const playbook = breach?.playbook;
  const hasPlaybook = playbook && playbook.steps && playbook.steps.length > 0;
  const isAlarm = evaluation.severity === 'alarm';
  
  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      isAlarm 
        ? "border-status-critical/30 bg-status-critical/5" 
        : "border-status-warning/30 bg-status-warning/5"
    )}>
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-semibold text-foreground text-sm">{evaluation.message}</div>
            {breach && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded",
                  breach.condition === 'low'
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                )}>
                  {breach.condition === 'low' ? (
                    <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUp className="w-3 h-3" />
                  )}
                  {breach.condition === 'low' ? 'Below minimum' : 'Above maximum'}
                </span>
              </div>
            )}
          </div>
          
          {hasPlaybook && !loading && (
            <button
              onClick={onToggle}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors",
                isAlarm
                  ? "bg-status-critical/20 text-status-critical hover:bg-status-critical/30"
                  : "bg-status-warning/20 text-status-warning hover:bg-status-warning/30"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isExpanded ? 'Hide' : 'View'} Playbook</span>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded Playbook */}
      {isExpanded && hasPlaybook && (
        <div className={cn(
          "border-t p-4",
          isAlarm 
            ? "border-status-critical/20 bg-status-critical/10" 
            : "border-status-warning/20 bg-status-warning/10"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className={cn(
              "w-4 h-4",
              isAlarm ? "text-status-critical" : "text-status-warning"
            )} />
            <span className="font-semibold text-foreground text-sm">{playbook.title}</span>
          </div>
          
          <ol className="space-y-2">
            {playbook.steps.map((step: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <span className={cn(
                  "w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5",
                  isAlarm 
                    ? "bg-status-critical/30 text-status-critical" 
                    : "bg-status-warning/30 text-status-warning"
                )}>
                  {index + 1}
                </span>
                <span className="text-sm text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          
          {playbook.referenceLinks && playbook.referenceLinks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1.5">References:</p>
              <div className="flex flex-wrap gap-2">
                {playbook.referenceLinks.map((ref: string, i: number) => (
                  <span 
                    key={i} 
                    className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded"
                  >
                    📄 {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete these steps before submitting to ensure proper response</span>
          </div>
        </div>
      )}
      
      {/* Quick actions preview when collapsed */}
      {!isExpanded && evaluation.actions.length > 0 && (
        <div className="px-3 pb-3">
          <ul className="text-xs text-muted-foreground space-y-1">
            {evaluation.actions.slice(0, 2).map((action, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground/50">•</span>
                <span className="line-clamp-1">{action}</span>
              </li>
            ))}
            {evaluation.actions.length > 2 && (
              <li className="text-muted-foreground/70 ml-3">
                +{evaluation.actions.length - 2} more steps...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Keep legacy AlertPanel for backwards compatibility
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
