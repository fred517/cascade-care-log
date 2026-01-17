import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricChart } from '@/components/charts/MetricChart';
import { mockReadings, mockThresholds } from '@/data/mockData';
import { PARAMETERS, ParameterKey, getParametersByCategory, PARAMETER_ICONS } from '@/types/wastewater';
import { cn } from '@/lib/utils';

const timeRanges = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

// Core parameters for the main selector
const CORE_PARAMS: ParameterKey[] = ['ph', 'do', 'orp', 'mlss', 'svi', 'ammonia_tan'];

export default function Trends() {
  const [selectedMetric, setSelectedMetric] = useState<ParameterKey>('do');
  const [selectedRange, setSelectedRange] = useState(30);
  const [showAllParams, setShowAllParams] = useState(false);

  const displayParams = showAllParams ? Object.keys(PARAMETERS) as ParameterKey[] : CORE_PARAMS;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Trend Analysis</h1>
          <p className="text-muted-foreground">
            View historical data and identify patterns across all parameters
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            {displayParams.map((paramKey) => {
              const param = PARAMETERS[paramKey];
              return (
                <button
                  key={paramKey}
                  onClick={() => setSelectedMetric(paramKey)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                    selectedMetric === paramKey
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{PARAMETER_ICONS[paramKey]}</span>
                  {param.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowAllParams(!showAllParams)}
            className="text-sm text-primary hover:underline"
          >
            {showAllParams ? 'Show Core Only' : 'Show All Parameters'}
          </button>

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
            <div className="flex items-center gap-2">
              <span className="text-2xl">{PARAMETER_ICONS[selectedMetric]}</span>
              <h2 className="text-xl font-semibold text-foreground">
                {PARAMETERS[selectedMetric].label}
              </h2>
              <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                {PARAMETERS[selectedMetric].category}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {PARAMETERS[selectedMetric].methodHint || 'No method hint available'} 
              {PARAMETERS[selectedMetric].unit && ` • Unit: ${PARAMETERS[selectedMetric].unit}`}
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
        <h2 className="text-xl font-semibold text-foreground mb-4">All Parameters Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayParams.map((paramKey) => {
            const param = PARAMETERS[paramKey];
            const threshold = mockThresholds.find(t => t.metricId === paramKey);
            
            return (
              <div 
                key={paramKey}
                className={cn(
                  "bg-card rounded-xl border p-4 transition-all duration-200 cursor-pointer",
                  selectedMetric === paramKey 
                    ? "border-primary" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedMetric(paramKey)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{PARAMETER_ICONS[paramKey]}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{param.label}</h3>
                      <p className="text-xs text-muted-foreground">{param.category} • {param.unit || 'unitless'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Watch Range</p>
                    <p className="text-sm font-mono">
                      {param.watch?.min ?? '-'} - {param.watch?.max ?? '-'}
                    </p>
                  </div>
                </div>
                <div className="h-32">
                  <MetricChart
                    metricId={paramKey}
                    readings={mockReadings}
                    threshold={threshold}
                    days={7}
                    showThresholdBands={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
