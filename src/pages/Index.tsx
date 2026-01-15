import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { MetricChart } from '@/components/charts/MetricChart';
import { mockReadings, mockThresholds, mockAlerts, getDailyStatus } from '@/data/mockData';
import { METRICS, MetricType } from '@/types/wastewater';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [alerts, setAlerts] = useState(mockAlerts);

  const dailyStatuses = useMemo(() => 
    getDailyStatus(mockReadings, mockThresholds), 
    []
  );

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Good morning, Operator
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Alert Banner */}
        <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />

        {/* Quick Stats */}
        <QuickStats statuses={dailyStatuses} />

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
          <div className="bg-card rounded-xl border border-border p-6 animate-slide-up">
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
              readings={mockReadings}
              threshold={mockThresholds.find(t => t.metricId === selectedMetric)}
            />
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Readings</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Metric</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Value</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {mockReadings.slice(0, 6).map((reading, index) => {
                    const metric = METRICS[reading.metricId];
                    const threshold = mockThresholds.find(t => t.metricId === reading.metricId);
                    const isOutOfRange = threshold && (
                      reading.value < threshold.min || reading.value > threshold.max
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
                            {reading.value.toFixed(metric.precision)} {metric.unit}
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
                          {reading.timestamp.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {reading.enteredBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
