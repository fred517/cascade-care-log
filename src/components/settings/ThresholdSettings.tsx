import { useState } from 'react';
import { Threshold, PARAMETERS, ParameterKey, getDefaultThresholds, getParametersByCategory, ParameterCategory } from '@/types/wastewater';
import { Check, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThresholdSettingsProps {
  thresholds: Threshold[];
  onSave: (thresholds: Threshold[]) => void;
}

export function ThresholdSettings({ thresholds, onSave }: ThresholdSettingsProps) {
  const [localThresholds, setLocalThresholds] = useState<Threshold[]>(thresholds);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<ParameterCategory>>(
    new Set(['Core', 'Process'])
  );

  const handleChange = (metricId: ParameterKey, field: 'min' | 'max' | 'enabled', value: number | boolean) => {
    setLocalThresholds(prev => prev.map(t => 
      t.metricId === metricId ? { ...t, [field]: value } : t
    ));
  };

  const handleReset = (metricId: ParameterKey) => {
    const param = PARAMETERS[metricId];
    const defaults = getDefaultThresholds(param);
    setLocalThresholds(prev => prev.map(t => 
      t.metricId === metricId 
        ? { ...t, min: defaults.min, max: defaults.max } 
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

  const toggleCategory = (category: ParameterCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const paramsByCategory = getParametersByCategory();
  const categories: ParameterCategory[] = ['Core', 'Process', 'Solids', 'Nutrients', 'Softwater'];

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const params = paramsByCategory[category];
        if (params.length === 0) return null;
        
        const isExpanded = expandedCategories.has(category);
        
        return (
          <div key={category} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold text-foreground">{category} Parameters</span>
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>
            
            {isExpanded && (
              <div className="p-4 space-y-4">
                {params.map(param => {
                  const threshold = localThresholds.find(t => t.metricId === param.key);
                  if (!threshold) return null;

                  const defaults = getDefaultThresholds(param);
                  const isModified = 
                    threshold.min !== defaults.min || 
                    threshold.max !== defaults.max;

                  return (
                    <div 
                      key={param.key}
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
                              onChange={(e) => handleChange(param.key, 'enabled', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                          <div>
                            <h3 className="font-semibold text-foreground">{param.label}</h3>
                            <p className="text-sm text-muted-foreground">
                              Default: {defaults.min} - {defaults.max} {param.unit}
                            </p>
                          </div>
                        </div>

                        {isModified && (
                          <button
                            onClick={() => handleReset(param.key)}
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
                            Minimum {param.unit && `(${param.unit})`}
                          </label>
                          <input
                            type="number"
                            step={param.decimals > 0 ? Math.pow(10, -param.decimals) : 1}
                            value={threshold.min}
                            onChange={(e) => handleChange(param.key, 'min', parseFloat(e.target.value) || 0)}
                            disabled={!threshold.enabled}
                            className="input-field font-mono disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">
                            Maximum {param.unit && `(${param.unit})`}
                          </label>
                          <input
                            type="number"
                            step={param.decimals > 0 ? Math.pow(10, -param.decimals) : 1}
                            value={threshold.max}
                            onChange={(e) => handleChange(param.key, 'max', parseFloat(e.target.value) || 0)}
                            disabled={!threshold.enabled}
                            className="input-field font-mono disabled:opacity-50"
                          />
                        </div>
                      </div>
                      
                      {param.methodHint && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          💡 {param.methodHint}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

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
