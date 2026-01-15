import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { METRICS, MetricType } from '@/types/wastewater';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Loader2,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { 
  format, 
  subWeeks, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfDay,
  endOfDay,
  addWeeks,
  addMonths,
  isSameWeek,
  isSameMonth
} from 'date-fns';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

type ComparisonType = 'week' | 'month';

interface ComparisonPeriod {
  label: string;
  from: Date;
  to: Date;
}

interface MetricComparisonStats {
  current: {
    count: number;
    min: number;
    max: number;
    avg: number;
    outOfRange: number;
  };
  previous: {
    count: number;
    min: number;
    max: number;
    avg: number;
    outOfRange: number;
  };
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface ReportComparisonProps {
  siteId: string;
  getMetricThreshold: (metricId: MetricType) => { min_value: number; max_value: number } | undefined;
}

export function ReportComparison({ siteId, getMetricThreshold }: ReportComparisonProps) {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('week');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [currentReadings, setCurrentReadings] = useState<any[]>([]);
  const [previousReadings, setPreviousReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Calculate comparison periods
  const periods = useMemo((): { current: ComparisonPeriod; previous: ComparisonPeriod } => {
    if (comparisonType === 'week') {
      const currentStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const currentEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
      const previousStart = startOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 });
      const previousEnd = endOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 });

      return {
        current: {
          label: isSameWeek(currentStart, new Date(), { weekStartsOn: 1 }) 
            ? 'This Week' 
            : format(currentStart, 'MMM d') + ' - ' + format(currentEnd, 'MMM d'),
          from: currentStart,
          to: currentEnd,
        },
        previous: {
          label: 'Previous Week',
          from: previousStart,
          to: previousEnd,
        },
      };
    } else {
      const currentStart = startOfMonth(referenceDate);
      const currentEnd = endOfMonth(referenceDate);
      const previousStart = startOfMonth(subMonths(referenceDate, 1));
      const previousEnd = endOfMonth(subMonths(referenceDate, 1));

      return {
        current: {
          label: isSameMonth(currentStart, new Date()) 
            ? 'This Month' 
            : format(currentStart, 'MMMM yyyy'),
          from: currentStart,
          to: currentEnd,
        },
        previous: {
          label: format(previousStart, 'MMMM yyyy'),
          from: previousStart,
          to: previousEnd,
        },
      };
    }
  }, [comparisonType, referenceDate]);

  // Navigate periods
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (comparisonType === 'week') {
      setReferenceDate(prev => 
        direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      );
    } else {
      setReferenceDate(prev => 
        direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
      );
    }
  };

  // Fetch comparison data
  const fetchComparisonData = async () => {
    if (!siteId) return;

    setLoading(true);
    try {
      // Fetch current period
      const { data: current, error: currentError } = await supabase
        .from('readings')
        .select('*')
        .eq('site_id', siteId)
        .gte('recorded_at', startOfDay(periods.current.from).toISOString())
        .lte('recorded_at', endOfDay(periods.current.to).toISOString())
        .order('recorded_at', { ascending: false });

      if (currentError) throw currentError;

      // Fetch previous period
      const { data: previous, error: previousError } = await supabase
        .from('readings')
        .select('*')
        .eq('site_id', siteId)
        .gte('recorded_at', startOfDay(periods.previous.from).toISOString())
        .lte('recorded_at', endOfDay(periods.previous.to).toISOString())
        .order('recorded_at', { ascending: false });

      if (previousError) throw previousError;

      setCurrentReadings(current || []);
      setPreviousReadings(previous || []);
      setHasData(true);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      toast.error('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate comparison statistics
  const comparisonStats = useMemo(() => {
    const stats: Record<MetricType, MetricComparisonStats> = {} as any;

    Object.keys(METRICS).forEach(metricId => {
      const currentMetricReadings = currentReadings.filter(r => r.metric_id === metricId);
      const previousMetricReadings = previousReadings.filter(r => r.metric_id === metricId);
      const threshold = getMetricThreshold(metricId as MetricType);

      const calcStats = (readings: any[]) => {
        if (readings.length === 0) {
          return { count: 0, min: 0, max: 0, avg: 0, outOfRange: 0 };
        }
        const values = readings.map(r => Number(r.value));
        const outOfRange = threshold
          ? values.filter(v => v < threshold.min_value || v > threshold.max_value).length
          : 0;
        return {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          outOfRange,
        };
      };

      const current = calcStats(currentMetricReadings);
      const previous = calcStats(previousMetricReadings);
      const change = current.avg - previous.avg;
      const changePercent = previous.avg !== 0 ? (change / previous.avg) * 100 : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 5) {
        trend = change > 0 ? 'up' : 'down';
      }

      stats[metricId as MetricType] = {
        current,
        previous,
        change,
        changePercent,
        trend,
      };
    });

    return stats;
  }, [currentReadings, previousReadings, getMetricThreshold]);

  // Chart data
  const chartData = useMemo(() => {
    return Object.entries(METRICS).map(([id, metric]) => {
      const stats = comparisonStats[id as MetricType];
      return {
        name: metric.name,
        metricId: id,
        current: stats?.current.avg || 0,
        previous: stats?.previous.avg || 0,
        change: stats?.changePercent || 0,
        unit: metric.unit,
        precision: metric.precision,
      };
    }).filter(d => d.current > 0 || d.previous > 0);
  }, [comparisonStats]);

  const hasAnyData = currentReadings.length > 0 || previousReadings.length > 0;

  return (
    <div className="space-y-6">
      {/* Comparison Type Selection */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Period Comparison
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setComparisonType('week');
                setReferenceDate(new Date());
                setHasData(false);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                comparisonType === 'week'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              Week to Week
            </button>
            <button
              onClick={() => {
                setComparisonType('month');
                setReferenceDate(new Date());
                setHasData(false);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                comparisonType === 'month'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              Month to Month
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
              disabled={
                (comparisonType === 'week' && isSameWeek(referenceDate, new Date(), { weekStartsOn: 1 })) ||
                (comparisonType === 'month' && isSameMonth(referenceDate, new Date()))
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{periods.previous.label}</span>
                <span className="text-muted-foreground">
                  ({format(periods.previous.from, 'MMM d')} - {format(periods.previous.to, 'MMM d')})
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">{periods.current.label}</span>
                <span className="text-muted-foreground">
                  ({format(periods.current.from, 'MMM d')} - {format(periods.current.to, 'MMM d')})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={fetchComparisonData}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Compare Periods
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {hasData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(METRICS).map(([id, metric]) => {
              const stats = comparisonStats[id as MetricType];
              if (!stats || (stats.current.count === 0 && stats.previous.count === 0)) return null;

              return (
                <div
                  key={id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{metric.name}</span>
                    {stats.trend === 'up' && <TrendingUp className="w-4 h-4 text-status-warning" />}
                    {stats.trend === 'down' && <TrendingDown className="w-4 h-4 text-status-info" />}
                    {stats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Current:</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {stats.current.count > 0 ? stats.current.avg.toFixed(metric.precision) : '-'}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{metric.unit}</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Previous:</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {stats.previous.count > 0 ? stats.previous.avg.toFixed(metric.precision) : '-'}
                        <span className="text-xs ml-1">{metric.unit}</span>
                      </span>
                    </div>
                  </div>

                  {stats.current.count > 0 && stats.previous.count > 0 && (
                    <div className={cn(
                      "mt-3 pt-3 border-t border-border text-center",
                    )}>
                      <span className={cn(
                        "text-sm font-semibold",
                        stats.changePercent > 5 ? "text-status-warning" :
                        stats.changePercent < -5 ? "text-status-info" :
                        "text-muted-foreground"
                      )}>
                        {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.current.count} vs {stats.previous.count} readings
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison Chart */}
          {chartData.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Average Values Comparison
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        const item = props.payload;
                        return [
                          `${value.toFixed(item.precision)} ${item.unit}`,
                          name === 'previous' ? periods.previous.label : periods.current.label
                        ];
                      }}
                    />
                    <Legend 
                      verticalAlign="top"
                      formatter={(value) => value === 'previous' ? periods.previous.label : periods.current.label}
                    />
                    <Bar dataKey="previous" fill="hsl(var(--muted-foreground))" name="previous" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" fill="hsl(var(--primary))" name="current" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Comparison Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Detailed Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Metric</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground" colSpan={3}>
                      {periods.previous.label}
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground" colSpan={3}>
                      {periods.current.label}
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Change</th>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground"></th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Count</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Avg</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Range</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Count</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Avg</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Range</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(METRICS).map(([id, metric], index) => {
                    const stats = comparisonStats[id as MetricType];
                    if (!stats || (stats.current.count === 0 && stats.previous.count === 0)) return null;

                    return (
                      <tr 
                        key={id}
                        className={cn(
                          "border-b border-border last:border-0",
                          index % 2 === 0 ? "bg-card" : "bg-muted/20"
                        )}
                      >
                        <td className="p-4">
                          <span className="font-medium text-foreground">{metric.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({metric.unit})</span>
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.previous.count || '-'}
                        </td>
                        <td className="p-4 text-center font-mono">
                          {stats.previous.count > 0 ? stats.previous.avg.toFixed(metric.precision) : '-'}
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.previous.count > 0 
                            ? `${stats.previous.min.toFixed(metric.precision)} - ${stats.previous.max.toFixed(metric.precision)}`
                            : '-'}
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.current.count || '-'}
                        </td>
                        <td className="p-4 text-center font-mono font-semibold">
                          {stats.current.count > 0 ? stats.current.avg.toFixed(metric.precision) : '-'}
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.current.count > 0 
                            ? `${stats.current.min.toFixed(metric.precision)} - ${stats.current.max.toFixed(metric.precision)}`
                            : '-'}
                        </td>
                        <td className="p-4 text-center">
                          {stats.current.count > 0 && stats.previous.count > 0 ? (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                              stats.changePercent > 5 ? "bg-status-warning/20 text-status-warning" :
                              stats.changePercent < -5 ? "bg-status-info/20 text-status-info" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {stats.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                              {stats.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                              {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!hasData && !loading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Comparison Data</h3>
          <p className="text-muted-foreground mb-4">
            Select a comparison type and click "Compare Periods" to view the comparison.
          </p>
        </div>
      )}

      {/* No Data for Periods */}
      {hasData && !hasAnyData && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Readings Found</h3>
          <p className="text-muted-foreground">
            No readings were found for the selected periods. Try selecting a different time range.
          </p>
        </div>
      )}
    </div>
  );
}
