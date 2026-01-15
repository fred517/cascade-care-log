import { METRICS, DailyStatus, MetricType } from '@/types/wastewater';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  status: DailyStatus;
  onClick?: () => void;
}

const metricIcons: Record<MetricType, string> = {
  svi: '🧪',
  ph: '⚗️',
  do: '💨',
  orp: '⚡',
  mlss: '🔬',
  ammonia: '🧫',
};

export function MetricCard({ status, onClick }: MetricCardProps) {
  const metric = METRICS[status.metricId];
  
  const statusColors = {
    normal: 'border-status-normal/30 bg-status-normal/5',
    warning: 'border-status-warning/30 bg-status-warning/5',
    critical: 'border-status-critical/30 bg-status-critical/5',
    missing: 'border-muted/30 bg-muted/5',
  };

  const statusIndicatorClass = {
    normal: 'status-normal',
    warning: 'status-warning',
    critical: 'status-critical',
    missing: 'bg-muted-foreground/50',
  };

  const TrendIcon = status.trend === 'rising' ? TrendingUp : 
                    status.trend === 'falling' ? TrendingDown : Minus;

  const formatValue = (value: number | null) => {
    if (value === null) return '--';
    return value.toFixed(metric.precision);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'No data';
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "metric-card w-full text-left transition-all duration-300 hover:scale-[1.02]",
        statusColors[status.status]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{metricIcons[status.metricId]}</span>
          <div>
            <h3 className="font-semibold text-foreground">{metric.name}</h3>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </div>
        </div>
        <div className={cn("status-indicator", statusIndicatorClass[status.status])} />
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold font-mono text-foreground">
          {formatValue(status.latestValue)}
        </span>
        <span className="text-sm text-muted-foreground">{metric.unit}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTime(status.lastUpdated)}</span>
        </div>
        
        {status.trend && status.status !== 'missing' && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full",
            status.trend === 'rising' && "bg-status-warning/20 text-status-warning",
            status.trend === 'falling' && "bg-status-info/20 text-status-info",
            status.trend === 'stable' && "bg-muted text-muted-foreground"
          )}>
            <TrendIcon className="w-3 h-3" />
            <span className="capitalize">{status.trend}</span>
          </div>
        )}

        {status.status === 'critical' && (
          <div className="flex items-center gap-1 text-status-critical">
            <AlertTriangle className="w-3 h-3" />
            <span>Action Required</span>
          </div>
        )}
      </div>
    </button>
  );
}
