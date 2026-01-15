import { useState } from 'react';
import { Threshold, METRICS, MetricType } from '@/types/wastewater';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThresholdSettingsProps {
  thresholds: Threshold[];
  onSave: (thresholds: Threshold[]) => void;
}

export function ThresholdSettings({ thresholds, onSave }: ThresholdSettingsProps) {
  const [localThresholds, setLocalThresholds] = useState<Threshold[]>(thresholds);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (metricId: MetricType, field: 'min' | 'max' | 'enabled', value: number | boolean) => {
    setLocalThresholds(prev => prev.map(t => 
      t.metricId === metricId ? { ...t, [field]: value } : t
    ));
  };

  const handleReset = (metricId: MetricType) => {
    const metric = METRICS[metricId];
    setLocalThresholds(prev => prev.map(t => 
      t.metricId === metricId 
        ? { ...t, min: metric.defaultMin, max: metric.defaultMax } 
        : t
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    onSave(localThresholds);
    toast.success('Thresholds saved successfully');
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {Object.values(METRICS).map(metric => {
          const threshold = localThresholds.find(t => t.metricId === metric.id);
          if (!threshold) return null;

          const isModified = 
            threshold.min !== metric.defaultMin || 
            threshold.max !== metric.defaultMax;

          return (
            <div 
              key={metric.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-300",
                threshold.enabled 
                  ? "bg-card border-border" 
                  : "bg-muted/30 border-muted"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={threshold.enabled}
                      onChange={(e) => handleChange(metric.id, 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <div>
                    <h3 className="font-semibold text-foreground">{metric.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Default: {metric.defaultMin} - {metric.defaultMax} {metric.unit}
                    </p>
                  </div>
                </div>

                {isModified && (
                  <button
                    onClick={() => handleReset(metric.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Minimum {metric.unit && `(${metric.unit})`}
                  </label>
                  <input
                    type="number"
                    step={metric.precision > 0 ? Math.pow(10, -metric.precision) : 1}
                    value={threshold.min}
                    onChange={(e) => handleChange(metric.id, 'min', parseFloat(e.target.value) || 0)}
                    disabled={!threshold.enabled}
                    className="input-field font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Maximum {metric.unit && `(${metric.unit})`}
                  </label>
                  <input
                    type="number"
                    step={metric.precision > 0 ? Math.pow(10, -metric.precision) : 1}
                    value={threshold.max}
                    onChange={(e) => handleChange(metric.id, 'max', parseFloat(e.target.value) || 0)}
                    disabled={!threshold.enabled}
                    className="input-field font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 btn-primary disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Thresholds
            </>
          )}
        </button>
      </div>
    </div>
  );
}
