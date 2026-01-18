import { AlertEvent, DailyStatus, PARAMETERS, ParameterKey } from '@/types/wastewater';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertsOverviewProps {
  alerts: AlertEvent[];
  statuses: DailyStatus[];
}

export function AlertsOverview({ alerts, statuses }: AlertsOverviewProps) {
  // Get parameters that need attention (warning or critical)
  const needsAttention = statuses.filter(s => s.status === 'warning' || s.status === 'critical');
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'alarm':
        return 'bg-status-critical/20 text-status-critical border-status-critical/30';
      case 'high':
      case 'warning':
      case 'watch':
        return 'bg-status-warning/20 text-status-warning border-status-warning/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-status-critical" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-status-warning" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-status-normal" />;
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="w-3 h-3" />;
      case 'falling':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => {
                const param = PARAMETERS[alert.metricId as ParameterKey];
                return (
                  <div 
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      getSeverityColor(alert.severity)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(alert.severity === 'critical' || alert.severity === 'alarm' ? 'critical' : 'warning')}
                      <div>
                        <p className="font-medium text-sm">{param?.label || alert.metricId}</p>
                        <p className="text-xs opacity-80">
                          Value: {alert.value.toFixed(param?.decimals || 2)} {param?.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-70">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Parameters Needing Attention */}
        {needsAttention.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Parameters Needing Attention</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {needsAttention.map(status => {
                const param = PARAMETERS[status.metricId];
                return (
                  <div 
                    key={status.metricId}
                    className={cn(
                      "p-3 rounded-lg border",
                      status.status === 'critical' 
                        ? 'bg-status-critical/10 border-status-critical/30'
                        : 'bg-status-warning/10 border-status-warning/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{param?.label}</span>
                      {getStatusIcon(status.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">
                        {status.latestValue?.toFixed(param?.decimals || 2)} {param?.unit}
                      </span>
                      {status.trend && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                          status.trend === 'rising' && 'bg-status-warning/20 text-status-warning',
                          status.trend === 'falling' && 'bg-status-info/20 text-status-info',
                          status.trend === 'stable' && 'bg-muted text-muted-foreground'
                        )}>
                          {getTrendIcon(status.trend)}
                          {status.trend}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Good Message */}
        {alerts.length === 0 && needsAttention.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-status-normal" />
            <p className="text-lg font-medium text-status-normal">All Systems Normal</p>
            <p className="text-sm text-muted-foreground mt-1">
              All parameters are within acceptable ranges
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
