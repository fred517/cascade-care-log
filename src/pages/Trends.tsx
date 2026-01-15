import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricChart } from '@/components/charts/MetricChart';
import { mockReadings, mockThresholds } from '@/data/mockData';
import { METRICS, MetricType } from '@/types/wastewater';
import { cn } from '@/lib/utils';

const timeRanges = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

export default function Trends() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('do');
  const [selectedRange, setSelectedRange] = useState(30);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Trend Analysis</h1>
          <p className="text-muted-foreground">
            View historical data and identify patterns across all metrics
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            {Object.values(METRICS).map((metric) => (
              <button
                key={metric.id}
                onClick={() => setSelectedMetric(metric.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  selectedMetric === metric.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {metric.name}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Time Range */}
          <div className="flex gap-2">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                  selectedRange === range.value
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {METRICS[selectedMetric].name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {METRICS[selectedMetric].description} • Unit: {METRICS[selectedMetric].unit || 'unitless'}
            </p>
          </div>
          <div className="h-80">
            <MetricChart
              metricId={selectedMetric}
              readings={mockReadings}
              threshold={mockThresholds.find(t => t.metricId === selectedMetric)}
              days={selectedRange}
            />
          </div>
        </div>

        {/* All Metrics Overview */}
        <h2 className="text-xl font-semibold text-foreground mb-4">All Metrics Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.values(METRICS).map((metric) => (
            <div 
              key={metric.id}
              className={cn(
                "bg-card rounded-xl border p-4 transition-all duration-200 cursor-pointer",
                selectedMetric === metric.id 
                  ? "border-primary" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setSelectedMetric(metric.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{metric.name}</h3>
                  <p className="text-xs text-muted-foreground">{metric.unit || 'unitless'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Range</p>
                  <p className="text-sm font-mono">
                    {metric.defaultMin} - {metric.defaultMax}
                  </p>
                </div>
              </div>
              <div className="h-32">
                <MetricChart
                  metricId={metric.id}
                  readings={mockReadings}
                  threshold={mockThresholds.find(t => t.metricId === metric.id)}
                  days={7}
                  showThresholdBands={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
