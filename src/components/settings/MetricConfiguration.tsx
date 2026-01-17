import { useState } from 'react';
import { useSiteMetricConfig } from '@/hooks/useSiteMetricConfig';
import { PARAMETERS, ParameterKey, PARAMETER_ICONS } from '@/types/wastewater';
import { cn } from '@/lib/utils';
import { 
  Check, 
  Loader2, 
  ChevronUp, 
  ChevronDown, 
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';

export function MetricConfiguration() {
  const { 
    configs, 
    loading, 
    saving, 
    toggleMetric, 
    setAllEnabled, 
    moveMetric, 
    saveConfigs,
    enabledCount 
  } = useSiteMetricConfig();

  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (metricId: ParameterKey) => {
    toggleMetric(metricId);
    setHasChanges(true);
  };

  const handleMove = (metricId: ParameterKey, direction: 'up' | 'down') => {
    moveMetric(metricId, direction);
    setHasChanges(true);
  };

  const handleSetAll = (enabled: boolean) => {
    setAllEnabled(enabled);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveConfigs();
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const minEnabledCount = 6;
  const isValidConfig = enabledCount >= minEnabledCount;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Metric Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Enable or disable metrics for this site. Minimum {minEnabledCount} metrics required.
            </p>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium",
            isValidConfig 
              ? "bg-status-normal/20 text-status-normal" 
              : "bg-status-warning/20 text-status-warning"
          )}>
            {enabledCount} / {configs.length} enabled
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleSetAll(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
        >
          <ToggleRight className="w-4 h-4" />
          Enable All
        </button>
        <button
          onClick={() => handleSetAll(false)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
        >
          <ToggleLeft className="w-4 h-4" />
          Disable All
        </button>
      </div>

      {/* Validation warning */}
      {!isValidConfig && (
        <div className="mb-6 p-4 rounded-xl bg-status-warning/10 border border-status-warning/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-status-warning">Not enough metrics enabled</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need at least {minEnabledCount} metrics enabled to ensure proper monitoring coverage.
              Currently {enabledCount} enabled.
            </p>
          </div>
        </div>
      )}

      {/* Metrics list */}
      <div className="space-y-2">
      {configs.map((config, index) => {
          const param = PARAMETERS[config.metric_id];
          const icon = PARAMETER_ICONS[config.metric_id] || '📊';
          
          return (
            <div
              key={config.metric_id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
                config.is_enabled
                  ? "bg-card border-border"
                  : "bg-muted/30 border-muted opacity-60"
              )}
            >
              {/* Drag handle / order controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMove(config.metric_id, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(config.metric_id, 'down')}
                  disabled={index === configs.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
                config.is_enabled ? "bg-primary/10" : "bg-muted"
              )}>
                <span className={cn(
                  config.is_enabled ? "" : "grayscale opacity-50"
                )}>{icon}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">{param.label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {param.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {param.unit ? `Unit: ${param.unit}` : 'No unit'} • Order: {index + 1}
                </p>
              </div>

              {/* Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.is_enabled}
                  onChange={() => handleToggle(config.metric_id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-6 pt-6 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving || !isValidConfig}
          className="flex items-center gap-2 btn-primary disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>
      </div>

      {hasChanges && !saving && (
        <p className="text-sm text-muted-foreground text-center mt-3">
          You have unsaved changes
        </p>
      )}
    </div>
  );
}
