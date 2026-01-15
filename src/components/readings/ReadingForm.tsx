import { useState } from 'react';
import { METRICS, MetricType, Reading } from '@/types/wastewater';
import { Check, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReadingFormProps {
  onSubmit: (readings: Omit<Reading, 'id'>[]) => void;
}

const metricOrder: MetricType[] = ['svi', 'ph', 'do', 'orp', 'mlss', 'ammonia'];

export function ReadingForm({ onSubmit }: ReadingFormProps) {
  const [values, setValues] = useState<Record<MetricType, string>>({
    svi: '',
    ph: '',
    do: '',
    orp: '',
    mlss: '',
    ammonia: '',
  });
  const [notes, setNotes] = useState<Record<MetricType, string>>({
    svi: '',
    ph: '',
    do: '',
    orp: '',
    mlss: '',
    ammonia: '',
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValueChange = (metricId: MetricType, value: string) => {
    // Allow empty, numbers, and decimal points
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setValues(prev => ({ ...prev, [metricId]: value }));
    }
  };

  const handleNoteChange = (metricId: MetricType, note: string) => {
    setNotes(prev => ({ ...prev, [metricId]: note }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const readings: Omit<Reading, 'id'>[] = [];
    const now = new Date();

    metricOrder.forEach(metricId => {
      const value = parseFloat(values[metricId]);
      if (!isNaN(value)) {
        readings.push({
          metricId,
          value,
          timestamp: now,
          enteredBy: 'Current Operator',
          siteId: 'site-1',
          notes: notes[metricId] || undefined,
        });
      }
    });

    if (readings.length === 0) {
      toast.error('Please enter at least one reading');
      setIsSubmitting(false);
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSubmit(readings);
    toast.success(`${readings.length} reading${readings.length > 1 ? 's' : ''} saved successfully`);
    
    // Reset form
    setValues({ svi: '', ph: '', do: '', orp: '', mlss: '', ammonia: '' });
    setNotes({ svi: '', ph: '', do: '', orp: '', mlss: '', ammonia: '' });
    setCurrentStep(0);
    setIsSubmitting(false);
  };

  const completedCount = metricOrder.filter(m => values[m] !== '').length;
  const currentMetric = metricOrder[currentStep];
  const metric = METRICS[currentMetric];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {metricOrder.map((m, index) => (
          <button
            key={m}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "flex-1 h-2 rounded-full transition-all duration-300",
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
          <div>
            <h2 className="text-2xl font-bold text-foreground">{metric.name}</h2>
            <p className="text-muted-foreground">{metric.description}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Range: {metric.defaultMin} - {metric.defaultMax} {metric.unit}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-muted-foreground mb-2">
            Value {metric.unit && <span className="text-primary">({metric.unit})</span>}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={values[currentMetric]}
            onChange={(e) => handleValueChange(currentMetric, e.target.value)}
            placeholder={`Enter ${metric.name} reading`}
            className="input-field text-2xl font-mono text-center"
            autoFocus
          />
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
          
          {currentStep < metricOrder.length - 1 ? (
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
          {metricOrder.map((m, index) => {
            const met = METRICS[m];
            const hasValue = values[m] !== '';
            
            return (
              <button
                key={m}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "p-3 rounded-lg text-left transition-all",
                  index === currentStep ? "bg-primary/10 border border-primary/30" :
                  hasValue ? "bg-status-normal/10 border border-status-normal/30" :
                  "bg-muted/50 border border-transparent hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{met.name}</span>
                  {hasValue && <Check className="w-4 h-4 text-status-normal" />}
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
