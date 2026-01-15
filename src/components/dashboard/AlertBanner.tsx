import { AlertEvent, METRICS } from '@/types/wastewater';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AlertBannerProps {
  alerts: AlertEvent[];
  onDismiss?: (alertId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  
  if (activeAlerts.length === 0) return null;

  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const hasMultiple = activeAlerts.length > 1;

  const primaryAlert = criticalAlerts[0] || activeAlerts[0];
  const metric = METRICS[primaryAlert.metricId];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4 mb-6 animate-slide-up",
      primaryAlert.severity === 'critical' 
        ? "bg-status-critical/10 border-status-critical/30" 
        : "bg-status-warning/10 border-status-warning/30"
    )}>
      {/* Animated background */}
      <div className={cn(
        "absolute inset-0 opacity-20",
        primaryAlert.severity === 'critical' 
          ? "bg-gradient-to-r from-status-critical/0 via-status-critical/20 to-status-critical/0" 
          : "bg-gradient-to-r from-status-warning/0 via-status-warning/20 to-status-warning/0"
      )} />

      <div className="relative flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          primaryAlert.severity === 'critical' ? "bg-status-critical/20" : "bg-status-warning/20"
        )}>
          <AlertTriangle className={cn(
            "w-6 h-6",
            primaryAlert.severity === 'critical' ? "text-status-critical" : "text-status-warning"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide",
              primaryAlert.severity === 'critical' 
                ? "bg-status-critical/20 text-status-critical" 
                : "bg-status-warning/20 text-status-warning"
            )}>
              {primaryAlert.severity}
            </span>
            {hasMultiple && (
              <span className="text-xs text-muted-foreground">
                +{activeAlerts.length - 1} more
              </span>
            )}
          </div>
          <p className="font-medium text-foreground">
            {metric.name} {primaryAlert.type === 'low' ? 'below' : 'above'} threshold
          </p>
          <p className="text-sm text-muted-foreground">
            Current: {primaryAlert.value.toFixed(metric.precision)} {metric.unit} 
            {' '}({primaryAlert.type === 'low' ? 'min' : 'max'}: {primaryAlert.threshold.toFixed(metric.precision)})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to="/alerts"
            className={cn(
              "flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
              primaryAlert.severity === 'critical' 
                ? "bg-status-critical text-white hover:bg-status-critical/90" 
                : "bg-status-warning text-white hover:bg-status-warning/90"
            )}
          >
            View Playbook
            <ChevronRight className="w-4 h-4" />
          </Link>
          
          {onDismiss && (
            <button 
              onClick={() => onDismiss(primaryAlert.id)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
