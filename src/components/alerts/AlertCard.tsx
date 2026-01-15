import { AlertEvent, METRICS, ActionPlaybook } from '@/types/wastewater';
import { AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';

interface AlertCardProps {
  alert: AlertEvent;
  playbook?: ActionPlaybook;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
}

export function AlertCard({ alert, playbook, onAcknowledge, onResolve }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const metric = METRICS[alert.metricId];

  const severityColors = {
    low: 'border-status-info bg-status-info/5',
    high: 'border-status-warning bg-status-warning/5',
    critical: 'border-status-critical bg-status-critical/5',
  };

  const statusBadge = {
    active: { label: 'Active', color: 'bg-status-critical text-white' },
    acknowledged: { label: 'Acknowledged', color: 'bg-status-warning text-white' },
    resolved: { label: 'Resolved', color: 'bg-status-normal text-white' },
  };

  return (
    <div className={cn(
      "rounded-xl border-l-4 bg-card border border-border overflow-hidden transition-all duration-300",
      severityColors[alert.severity]
    )}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            alert.severity === 'critical' ? "bg-status-critical/20" : "bg-status-warning/20"
          )}>
            <AlertTriangle className={cn(
              "w-5 h-5",
              alert.severity === 'critical' ? "text-status-critical" : "text-status-warning"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                statusBadge[alert.status].color
              )}>
                {statusBadge[alert.status].label}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {alert.severity}
              </span>
            </div>
            
            <h3 className="font-semibold text-foreground mb-1">
              {metric.name} {alert.type === 'low' ? 'Below' : 'Above'} Threshold
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono">
                Value: <span className="text-foreground font-medium">{alert.value.toFixed(metric.precision)}</span> {metric.unit}
              </span>
              <span className="font-mono">
                {alert.type === 'low' ? 'Min' : 'Max'}: {alert.threshold.toFixed(metric.precision)} {metric.unit}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(alert.triggeredAt, 'MMM d, h:mm a')}
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="border-t border-border pt-4">
            {/* Acknowledgment info */}
            {alert.acknowledgedBy && (
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Acknowledged by {alert.acknowledgedBy} on {format(alert.acknowledgedAt!, 'MMM d, h:mm a')}</span>
              </div>
            )}

            {/* Playbook */}
            {playbook && (
              <div className="mb-4">
                <h4 className="font-medium text-foreground mb-3">{playbook.title}</h4>
                <ol className="space-y-2">
                  {playbook.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
                
                {playbook.references.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">References:</p>
                    <ul className="text-xs text-primary">
                      {playbook.references.map((ref, i) => (
                        <li key={i}>• {ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              {alert.status === 'active' && onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="px-4 py-2 rounded-lg bg-status-warning text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Acknowledge
                </button>
              )}
              {alert.status !== 'resolved' && onResolve && (
                <button
                  onClick={() => onResolve(alert.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-status-normal text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
