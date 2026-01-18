import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { PendingApprovalsWidget } from '@/components/dashboard/PendingApprovalsWidget';
import { MetricChart } from '@/components/charts/MetricChart';
import { PARAMETERS, METRICS, ParameterKey, MetricType, DailyStatus, Reading, Threshold, AlertEvent, getDefaultThresholds, PARAMETER_LIST } from '@/types/wastewater';
import { useAuth } from '@/hooks/useAuth';
import { useReadings } from '@/hooks/useReadings';
import { useSite } from '@/hooks/useSite';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const { profile } = useAuth();
  const { site, loading: siteLoading } = useSite();
  const { readings, thresholds, loading: readingsLoading, getMetricThreshold } = useReadings();
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  // Fetch active alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('alert_events')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(5);

      if (data) {
        setAlerts(data.map(a => ({
          id: a.id,
          metricId: a.metric_id as MetricType,
          readingId: '',
          value: Number(a.value),
          threshold: a.threshold_min ?? a.threshold_max ?? 0,
          type: a.threshold_min && Number(a.value) < a.threshold_min ? 'low' : 'high',
          severity: a.severity as 'critical' | 'high' | 'medium' | 'low',
          triggeredAt: new Date(a.triggered_at),
          status: a.status as 'active' | 'acknowledged' | 'resolved',
          siteId: a.site_id || '',
        })));
      }
    };

    fetchAlerts();
  }, []);

  // Calculate daily statuses from real data
  const dailyStatuses = useMemo((): DailyStatus[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Object.values(METRICS).map((metric) => {
      const metricReadings = readings
        .filter((r) => r.metric_id === metric.id)
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

      const todayReading = metricReadings.find((r) => {
        const readingDate = new Date(r.recorded_at);
        readingDate.setHours(0, 0, 0, 0);
        return readingDate.getTime() === today.getTime();
      });

      const threshold = getMetricThreshold(metric.id as MetricType);
      const recentReadings = metricReadings.slice(0, 7);

      let trend: 'rising' | 'stable' | 'falling' | null = null;
      if (recentReadings.length >= 3) {
        const avgFirst = recentReadings.slice(0, 3).reduce((a, b) => a + Number(b.value), 0) / 3;
        const avgLast = recentReadings.slice(-3).reduce((a, b) => a + Number(b.value), 0) / 3;
        const diff = avgFirst - avgLast;
        const sensitivity = (metric.defaultMax - metric.defaultMin) * 0.1;

        if (diff > sensitivity) trend = 'rising';
        else if (diff < -sensitivity) trend = 'falling';
        else trend = 'stable';
      }

      let status: DailyStatus['status'] = 'missing';
      const latestValue = todayReading?.value ?? metricReadings[0]?.value;
      
      if (latestValue !== undefined && threshold) {
        const numValue = Number(latestValue);
        if (numValue < threshold.min_value || numValue > threshold.max_value) {
          const deviation = Math.max(
            threshold.min_value - numValue,
            numValue - threshold.max_value
          );
          const range = threshold.max_value - threshold.min_value;
          status = deviation > range * 0.5 ? 'critical' : 'warning';
        } else {
          status = 'normal';
        }
      } else if (latestValue !== undefined) {
        status = 'normal';
      }

      return {
        metricId: metric.id as MetricType,
        latestValue: latestValue !== undefined ? Number(latestValue) : null,
        status,
        lastUpdated: todayReading?.recorded_at 
          ? new Date(todayReading.recorded_at) 
          : metricReadings[0]?.recorded_at 
            ? new Date(metricReadings[0].recorded_at) 
            : null,
        trend,
      };
    });
  }, [readings, getMetricThreshold]);

  // Convert readings to chart format
  const chartReadings: Reading[] = useMemo(() => {
    return readings.map(r => ({
      id: r.id,
      metricId: r.metric_id as MetricType,
      value: Number(r.value),
      timestamp: new Date(r.recorded_at),
      enteredBy: 'Operator',
      siteId: r.site_id,
      notes: r.notes || undefined,
    }));
  }, [readings]);

  // Convert thresholds to chart format
  const chartThresholds: Threshold[] = useMemo(() => {
    return thresholds.map(t => ({
      metricId: t.metric_id as MetricType,
      min: t.min_value,
      max: t.max_value,
      enabled: t.enabled,
      siteId: t.site_id,
    }));
  }, [thresholds]);

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const loading = siteLoading || readingsLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {greeting()}, {profile?.display_name || 'Operator'}
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {site && <span className="ml-2">• {site.name}</span>}
          </p>
        </div>

        {/* Admin: Pending Approvals Widget */}
        <div className="mb-6">
          <PendingApprovalsWidget />
        </div>

        {/* Alert Banner */}
        <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />

        {/* Quick Stats */}
        <QuickStats statuses={dailyStatuses} />

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-4 mb-8">
          {dailyStatuses.map((status) => (
            <MetricCard
              key={status.metricId}
              status={status}
              onClick={() => setSelectedMetric(
                selectedMetric === status.metricId ? null : status.metricId
              )}
            />
          ))}
        </div>

        {/* Selected Metric Chart */}
        {selectedMetric && (
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 animate-slide-up min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {METRICS[selectedMetric].name} Trend
                </h2>
                <p className="text-sm text-muted-foreground">
                  Last 30 days with 7-day rolling average
                </p>
              </div>
              <button
                onClick={() => setSelectedMetric(null)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <MetricChart
              metricId={selectedMetric}
              readings={chartReadings}
              threshold={chartThresholds.find(t => t.metricId === selectedMetric)}
            />
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Readings</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {readings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No readings yet. Add your first reading to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Metric</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Value</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.slice(0, 10).map((reading, index) => {
                      const metric = METRICS[reading.metric_id as MetricType];
                      if (!metric) return null;
                      
                      const threshold = getMetricThreshold(reading.metric_id as MetricType);
                      const value = Number(reading.value);
                      const isOutOfRange = threshold && (
                        value < threshold.min_value || value > threshold.max_value
                      );
                      
                      return (
                        <tr 
                          key={reading.id} 
                          className={cn(
                            "border-b border-border last:border-0",
                            index % 2 === 0 ? "bg-card" : "bg-muted/20"
                          )}
                        >
                          <td className="p-4">
                            <span className="font-medium text-foreground">{metric.name}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-mono">
                              {value.toFixed(metric.precision)} {metric.unit}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              isOutOfRange 
                                ? "bg-status-warning/20 text-status-warning" 
                                : "bg-status-normal/20 text-status-normal"
                            )}>
                              {isOutOfRange ? 'Out of Range' : 'Normal'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(reading.recorded_at).toLocaleString('en-US', { 
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
