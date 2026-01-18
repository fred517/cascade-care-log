import { DailyStatus, AlertEvent } from '@/types/wastewater';
import { WeatherSnapshot } from '@/hooks/useWeatherSnapshots';
import { CheckCircle2, AlertTriangle, XCircle, Thermometer, Wind, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvironmentSummaryProps {
  statuses: DailyStatus[];
  alerts: AlertEvent[];
  weather: WeatherSnapshot | null | undefined;
}

export function EnvironmentSummary({ statuses, alerts, weather }: EnvironmentSummaryProps) {
  const counts = {
    normal: statuses.filter(s => s.status === 'normal').length,
    warning: statuses.filter(s => s.status === 'warning').length,
    critical: statuses.filter(s => s.status === 'critical').length,
  };

  const total = statuses.filter(s => s.status !== 'missing').length;
  const healthScore = total > 0 ? Math.round((counts.normal / total) * 100) : 0;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-status-normal';
    if (score >= 60) return 'text-status-warning';
    return 'text-status-critical';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Overall Health Score */}
      <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-card border border-border">
        <p className="text-xs text-muted-foreground mb-1">Environmental Health</p>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-4xl font-bold", getHealthColor(healthScore))}>
            {healthScore}%
          </span>
        </div>
        <p className={cn("text-sm mt-1", getHealthColor(healthScore))}>
          {getHealthLabel(healthScore)}
        </p>
      </div>

      {/* Temperature */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Temperature</p>
          <Thermometer className="w-4 h-4 text-primary" />
        </div>
        <span className="text-2xl font-bold text-foreground">
          {weather?.temperature_c !== null && weather?.temperature_c !== undefined 
            ? `${weather.temperature_c.toFixed(1)}°C` 
            : '--'}
        </span>
      </div>

      {/* Wind */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Wind Speed</p>
          <Wind className="w-4 h-4 text-primary" />
        </div>
        <span className="text-2xl font-bold text-foreground">
          {weather?.wind_speed_mps !== null && weather?.wind_speed_mps !== undefined
            ? `${weather.wind_speed_mps.toFixed(1)} m/s`
            : '--'}
        </span>
      </div>

      {/* Active Alerts */}
      <div className={cn(
        "p-4 rounded-xl border",
        alerts.length > 0 ? "bg-status-warning/10 border-status-warning/30" : "bg-card border-border"
      )}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Active Alerts</p>
          <AlertTriangle className={cn(
            "w-4 h-4",
            alerts.length > 0 ? "text-status-warning" : "text-muted-foreground"
          )} />
        </div>
        <span className={cn(
          "text-2xl font-bold",
          alerts.length > 0 ? "text-status-warning" : "text-foreground"
        )}>
          {alerts.length}
        </span>
      </div>

      {/* Parameters Status */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Parameters</p>
          <Droplets className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-status-normal" />
            <span className="text-sm font-medium">{counts.normal}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-status-warning" />
            <span className="text-sm font-medium">{counts.warning}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-status-critical" />
            <span className="text-sm font-medium">{counts.critical}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
