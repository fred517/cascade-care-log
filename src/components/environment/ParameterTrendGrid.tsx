import { Reading, Threshold, DailyStatus, PARAMETERS, PARAMETER_LIST, ParameterKey } from '@/types/wastewater';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricChart } from '@/components/charts/MetricChart';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ParameterTrendGridProps {
  readings: Reading[];
  thresholds: Threshold[];
  statuses: DailyStatus[];
  days: 7 | 30 | 90;
  onTimeRangeChange: (days: 7 | 30 | 90) => void;
  showAll?: boolean;
}

// Core parameters to show by default
const CORE_PARAMS: ParameterKey[] = ['ph', 'do', 'mlss', 'ammonia_tan', 'tss', 'temp_c'];

export function ParameterTrendGrid({ 
  readings, 
  thresholds, 
  statuses, 
  days, 
  onTimeRangeChange,
  showAll = false 
}: ParameterTrendGridProps) {
  const [expanded, setExpanded] = useState(showAll);
  const [selectedParam, setSelectedParam] = useState<ParameterKey | null>(null);

  // Filter parameters that have readings
  const paramsWithData = useMemo(() => {
    const readingMetrics = new Set(readings.map(r => r.metricId));
    return PARAMETER_LIST.filter(p => readingMetrics.has(p.key));
  }, [readings]);

  // Determine which parameters to display
  const displayedParams = useMemo(() => {
    if (expanded || showAll) {
      return paramsWithData;
    }
    // Show core params that have data, up to 6
    return paramsWithData.filter(p => CORE_PARAMS.includes(p.key)).slice(0, 6);
  }, [paramsWithData, expanded, showAll]);

  const getStatusColor = (metricId: ParameterKey) => {
    const status = statuses.find(s => s.metricId === metricId);
    switch (status?.status) {
      case 'critical':
        return 'border-status-critical/50';
      case 'warning':
        return 'border-status-warning/50';
      case 'normal':
        return 'border-status-normal/30';
      default:
        return 'border-border';
    }
  };

  const getStatusBadge = (metricId: ParameterKey) => {
    const status = statuses.find(s => s.metricId === metricId);
    const param = PARAMETERS[metricId];
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">
          {status?.latestValue?.toFixed(param.decimals) || '--'}
        </span>
        <span className="text-sm text-muted-foreground">{param.unit}</span>
      </div>
    );
  };

  if (paramsWithData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Parameter Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No readings data available yet</p>
            <p className="text-sm mt-1">Add readings to see trends here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Parameter Trends
          </CardTitle>
          
          {!showAll && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Time Range:</span>
              <div className="flex gap-1">
                {([7, 30, 90] as const).map(d => (
                  <Button
                    key={d}
                    variant={days === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => onTimeRangeChange(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Parameter Detail View */}
        {selectedParam && (
          <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{PARAMETERS[selectedParam].label}</h3>
                <p className="text-sm text-muted-foreground">
                  Last {days} days with 7-day rolling average
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedParam(null)}>
                Close
              </Button>
            </div>
            <div className="h-[300px]">
              <MetricChart
                metricId={selectedParam}
                readings={readings}
                threshold={thresholds.find(t => t.metricId === selectedParam)}
                days={days}
                showThresholdBands
              />
            </div>
          </div>
        )}

        {/* Parameter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedParams.map(param => {
            const threshold = thresholds.find(t => t.metricId === param.key);
            return (
              <button
                key={param.key}
                onClick={() => setSelectedParam(selectedParam === param.key ? null : param.key)}
                className={cn(
                  "p-4 rounded-xl border bg-card text-left transition-all hover:shadow-md",
                  getStatusColor(param.key),
                  selectedParam === param.key && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground">{param.label}</h4>
                  {getStatusBadge(param.key)}
                </div>
                <div className="h-[80px]">
                  <MetricChart
                    metricId={param.key}
                    readings={readings}
                    threshold={threshold}
                    days={days}
                    showThresholdBands={false}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Show More/Less Toggle */}
        {!showAll && paramsWithData.length > 6 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All {paramsWithData.length} Parameters
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
