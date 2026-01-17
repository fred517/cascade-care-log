import { useState, useRef } from 'react';
import { PARAMETERS, ParameterKey, Reading, Threshold, DEFAULT_PARAMETER_ORDER, PARAMETER_ICONS, getDefaultThresholds, getSeverity, getParametersByCategory, ParameterCategory } from '@/types/wastewater';
import { Check, ChevronRight, Info, AlertTriangle, Paperclip, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAlertEmail } from '@/hooks/useAlertEmail';

interface ReadingFormProps {
  onSubmit: (readings: Omit<Reading, 'id'>[]) => void;
  thresholds?: Threshold[];
  onUploadFile?: (file: File) => Promise<string | null>;
}

// Default to core parameters for simplified entry
const QUICK_ENTRY_PARAMS: ParameterKey[] = ['ph', 'do', 'orp', 'mlss', 'svi', 'ammonia_tan'];

interface AttachmentInfo {
  file: File;
  preview?: string;
  url?: string;
}

export function ReadingForm({ onSubmit, thresholds = [], onUploadFile }: ReadingFormProps) {
  const [values, setValues] = useState<Record<ParameterKey, string>>(
    Object.fromEntries(DEFAULT_PARAMETER_ORDER.map(k => [k, ''])) as Record<ParameterKey, string>
  );
  const [notes, setNotes] = useState<Record<ParameterKey, string>>(
    Object.fromEntries(DEFAULT_PARAMETER_ORDER.map(k => [k, ''])) as Record<ParameterKey, string>
  );
  const [attachments, setAttachments] = useState<Record<ParameterKey, AttachmentInfo | null>>(
    Object.fromEntries(DEFAULT_PARAMETER_ORDER.map(k => [k, null])) as Record<ParameterKey, AttachmentInfo | null>
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingMetric, setUploadingMetric] = useState<ParameterKey | null>(null);
  const [showAllParams, setShowAllParams] = useState(false);
  const { checkThresholds } = useAlertEmail();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use quick entry by default, full list when expanded
  const activeParams = showAllParams ? DEFAULT_PARAMETER_ORDER : QUICK_ENTRY_PARAMS;

  // Get threshold for a metric
  const getThreshold = (metricId: ParameterKey): Threshold | undefined => {
    return thresholds.find(t => t.metricId === metricId);
  };

  // Check if value is out of range using new severity system
  const getValueStatus = (metricId: ParameterKey, value: string): 'ok' | 'watch' | 'alarm' | null => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    
    const param = PARAMETERS[metricId];
    return getSeverity(numValue, param);
  };

  // Legacy check for low/high direction
  const getViolationType = (metricId: ParameterKey, value: string): 'low' | 'high' | null => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    
    const threshold = getThreshold(metricId);
    const param = PARAMETERS[metricId];
    const defaults = getDefaultThresholds(param);
    
    const min = threshold?.min ?? defaults.min;
    const max = threshold?.max ?? defaults.max;
    
    if (numValue < min) return 'low';
    if (numValue > max) return 'high';
    return null;
  };

  const handleValueChange = (metricId: ParameterKey, value: string) => {
    // Allow empty, numbers, negative numbers, and decimal points
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setValues(prev => ({ ...prev, [metricId]: value }));
    }
  };

  const handleNoteChange = (metricId: ParameterKey, note: string) => {
    setNotes(prev => ({ ...prev, [metricId]: note }));
  };

  const handleFileSelect = async (metricId: ParameterKey, file: File) => {
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
      setUploadingMetric(metricId);
      const url = await onUploadFile(file);
      setUploadingMetric(null);
      
      if (url) {
        setAttachments(prev => ({ ...prev, [metricId]: { file, preview, url } }));
        toast.success('File uploaded successfully');
      }
    } else {
      setAttachments(prev => ({ ...prev, [metricId]: { file, preview } }));
    }
  };

  const handleRemoveAttachment = (metricId: ParameterKey) => {
    const attachment = attachments[metricId];
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(prev => ({ ...prev, [metricId]: null }));
  };

  const triggerFileInput = (metricId: ParameterKey) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.metric = metricId;
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const metricId = e.target.dataset.metric as ParameterKey;
    if (file && metricId) {
      handleFileSelect(metricId, file);
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const readings: Omit<Reading, 'id'>[] = [];
    const violations: { metricId: ParameterKey; value: number; type: 'low' | 'high'; severity: 'watch' | 'alarm' }[] = [];
    const now = new Date();

    activeParams.forEach(metricId => {
      const value = parseFloat(values[metricId]);
      if (!isNaN(value)) {
        const attachment = attachments[metricId];
        readings.push({
          metricId,
          value,
          timestamp: now,
          enteredBy: 'Current Operator',
          siteId: 'site-1',
          notes: notes[metricId] || undefined,
          attachmentUrl: attachment?.url,
        });

        // Check for threshold violations
        const severity = getValueStatus(metricId, values[metricId]);
        const type = getViolationType(metricId, values[metricId]);
        if (severity && severity !== 'ok' && type) {
          violations.push({ metricId, value, type, severity });
        }
      }
    });

    if (readings.length === 0) {
      toast.error('Please enter at least one reading');
      setIsSubmitting(false);
      return;
    }

    onSubmit(readings);
    
    // Process threshold violations and trigger alerts
    if (violations.length > 0) {
      const alarmCount = violations.filter(v => v.severity === 'alarm').length;
      const watchCount = violations.filter(v => v.severity === 'watch').length;
      
      if (alarmCount > 0) {
        toast.error(`${alarmCount} ALARM${alarmCount > 1 ? 'S' : ''} triggered - immediate action required`);
      }
      if (watchCount > 0) {
        toast.warning(`${watchCount} parameter${watchCount > 1 ? 's' : ''} in WATCH range`);
      }
      
      for (const violation of violations) {
        const threshold = getThreshold(violation.metricId);
        const param = PARAMETERS[violation.metricId];
        const defaults = getDefaultThresholds(param);
        const thresholdMin = threshold?.min ?? defaults.min;
        const thresholdMax = threshold?.max ?? defaults.max;
        
        // Get playbook from parameter actions
        const playbook = param.actions?.[violation.severity] || [];
        
        try {
          await checkThresholds(
            violation.metricId,
            violation.value,
            thresholdMin,
            thresholdMax,
            playbook.length > 0 ? [{ condition: violation.type, steps: playbook }] : undefined
          );
        } catch (error) {
          console.error('Error triggering alert for', violation.metricId, error);
        }
      }
    }
    
    toast.success(`${readings.length} reading${readings.length > 1 ? 's' : ''} saved successfully`);
    
    // Cleanup previews
    Object.values(attachments).forEach(att => {
      if (att?.preview) URL.revokeObjectURL(att.preview);
    });
    
    // Reset form
    setValues(Object.fromEntries(DEFAULT_PARAMETER_ORDER.map(k => [k, ''])) as Record<ParameterKey, string>);
    setNotes(Object.fromEntries(DEFAULT_PARAMETER_ORDER.map(k => [k, ''])) as Record<ParameterKey, string>);
    setAttachments(Object.fromEntries(DEFAULT_PARAMETER_ORDER.map(k => [k, null])) as Record<ParameterKey, AttachmentInfo | null>);
    setCurrentStep(0);
    setIsSubmitting(false);
  };

  const completedCount = activeParams.filter(m => values[m] !== '').length;
  const currentMetric = activeParams[currentStep];
  const param = PARAMETERS[currentMetric];
  const currentAttachment = attachments[currentMetric];
  const isUploadingCurrent = uploadingMetric === currentMetric;
  const defaults = getDefaultThresholds(param);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Toggle for all parameters */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {showAllParams ? 'All Parameters' : 'Core Parameters'}
        </span>
        <button
          onClick={() => {
            setShowAllParams(!showAllParams);
            setCurrentStep(0);
          }}
          className="text-sm text-primary hover:underline"
        >
          {showAllParams ? 'Show Core Only' : 'Show All Parameters'}
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {activeParams.map((m, index) => (
          <button
            key={m}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "flex-shrink-0 h-2 rounded-full transition-all duration-300",
              showAllParams ? "w-4" : "flex-1",
              index < currentStep ? "bg-status-normal" :
              index === currentStep ? "bg-primary" :
              values[m] ? "bg-status-normal/50" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Current metric input */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{PARAMETER_ICONS[currentMetric]}</span>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{param.label}</h2>
              <p className="text-muted-foreground text-sm">{param.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Range: {defaults.min} - {defaults.max} {param.unit}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-muted-foreground mb-2">
            Value {param.unit && <span className="text-primary">({param.unit})</span>}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={values[currentMetric]}
            onChange={(e) => handleValueChange(currentMetric, e.target.value)}
            placeholder={`Enter ${param.label} reading`}
            className={cn(
              "input-field text-2xl font-mono text-center",
              getValueStatus(currentMetric, values[currentMetric]) === 'watch' && "border-status-warning ring-2 ring-status-warning/20",
              getValueStatus(currentMetric, values[currentMetric]) === 'alarm' && "border-status-critical ring-2 ring-status-critical/20"
            )}
            autoFocus
          />
          {getValueStatus(currentMetric, values[currentMetric]) && getValueStatus(currentMetric, values[currentMetric]) !== 'ok' && (
            <div className={cn(
              "flex items-start gap-2 mt-2 p-3 rounded-lg text-sm",
              getValueStatus(currentMetric, values[currentMetric]) === 'watch'
                ? "bg-status-warning/10 text-status-warning"
                : "bg-status-critical/10 text-status-critical"
            )}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">
                  {getValueStatus(currentMetric, values[currentMetric]) === 'alarm' ? 'ALARM' : 'WATCH'}:
                </span>
                {' '}Value is {getViolationType(currentMetric, values[currentMetric]) === 'low' ? 'below minimum' : 'above maximum'} threshold
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm text-muted-foreground mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes[currentMetric]}
            onChange={(e) => handleNoteChange(currentMetric, e.target.value)}
            placeholder="Add any observations..."
            className="input-field resize-none h-20"
          />
        </div>

        {/* Attachment section */}
        <div className="mb-6">
          <label className="block text-sm text-muted-foreground mb-2">
            Attachment (optional)
          </label>
          
          {currentAttachment ? (
            <div className="relative border border-border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                {currentAttachment.preview ? (
                  <img 
                    src={currentAttachment.preview} 
                    alt="Attachment preview" 
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentAttachment.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(currentAttachment.file.size / 1024).toFixed(1)} KB
                    {currentAttachment.url && (
                      <span className="text-status-normal ml-2">• Uploaded</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(currentMetric)}
                  className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => triggerFileInput(currentMetric)}
              disabled={isUploadingCurrent}
              className={cn(
                "w-full border-2 border-dashed border-border rounded-lg p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors",
                isUploadingCurrent && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploadingCurrent ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Paperclip className="w-5 h-5" />
                  <span>Add photo or document</span>
                </>
              )}
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Supports JPEG, PNG, GIF, WebP, and PDF (max 10MB)
          </p>
        </div>

        {/* Method hint */}
        {param.methodHint && (
          <div className="mb-6 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            <span className="font-medium">💡 Method:</span> {param.methodHint}
          </div>
        )}

        {/* Quick navigation */}
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              Previous
            </button>
          )}
          
          <div className="flex-1" />
          
          {currentStep < activeParams.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || completedCount === 0}
              className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save All Readings
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* All metrics quick view */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">All Readings</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {activeParams.map((m, index) => {
            const met = PARAMETERS[m];
            const hasValue = values[m] !== '';
            const hasAttachment = attachments[m] !== null;
            const status = getValueStatus(m, values[m]);
            
            return (
              <button
                key={m}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "p-3 rounded-lg text-left transition-all",
                  index === currentStep ? "bg-primary/10 border border-primary/30" :
                  status === 'alarm' ? "bg-status-critical/10 border border-status-critical/30" :
                  status === 'watch' ? "bg-status-warning/10 border border-status-warning/30" :
                  hasValue ? "bg-status-normal/10 border border-status-normal/30" :
                  "bg-muted/50 border border-transparent hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{met.label}</span>
                  <div className="flex items-center gap-1">
                    {hasAttachment && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                    {status === 'alarm' && <AlertTriangle className="w-4 h-4 text-status-critical" />}
                    {status === 'watch' && <AlertTriangle className="w-4 h-4 text-status-warning" />}
                    {hasValue && status === 'ok' && <Check className="w-4 h-4 text-status-normal" />}
                  </div>
                </div>
                <span className="text-lg font-mono">
                  {hasValue ? `${values[m]} ${met.unit}` : '--'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
