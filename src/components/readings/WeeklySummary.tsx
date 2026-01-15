import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, isToday } from 'date-fns';
import { METRICS, MetricType } from '@/types/wastewater';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reading {
  id: string;
  site_id: string;
  metric_id: string;
  value: number;
  notes: string | null;
  attachment_url: string | null;
  entered_by: string;
  recorded_at: string;
  created_at: string;
}

interface WeeklySummaryProps {
  readings: Reading[];
  weekStart?: Date;
  onDayClick?: (date: Date) => void;
}

const metricOrder: MetricType[] = ['svi', 'ph', 'do', 'orp', 'mlss', 'ammonia'];

export function WeeklySummary({ readings, weekStart, onDayClick }: WeeklySummaryProps) {
  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const previousWeekStart = subWeeks(currentWeekStart, 1);
  const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 });

  const weekDays = useMemo(() => 
    eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }),
    [currentWeekStart, currentWeekEnd]
  );

  // Get readings for each day
  const readingsByDay = useMemo(() => {
    const byDay: Record<string, Reading[]> = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      byDay[dayKey] = readings.filter(r => {
        const readingDate = new Date(r.recorded_at);
        return isSameDay(readingDate, day);
      });
    });
    return byDay;
  }, [readings, weekDays]);

  // Get previous week readings for trend comparison
  const previousWeekReadings = useMemo(() => {
    return readings.filter(r => {
      const date = new Date(r.recorded_at);
      return date >= previousWeekStart && date <= previousWeekEnd;
    });
  }, [readings, previousWeekStart, previousWeekEnd]);

  // Calculate weekly averages for each metric
  const weeklyMetricStats = useMemo(() => {
    const stats: Record<MetricType, { 
      currentAvg: number | null; 
      previousAvg: number | null;
      trend: 'up' | 'down' | 'stable' | null;
      min: number | null;
      max: number | null;
      count: number;
    }> = {} as any;

    metricOrder.forEach(metricId => {
      const currentReadings = readings.filter(r => {
        const date = new Date(r.recorded_at);
        return r.metric_id === metricId && date >= currentWeekStart && date <= currentWeekEnd;
      });

      const prevReadings = previousWeekReadings.filter(r => r.metric_id === metricId);

      const currentValues = currentReadings.map(r => r.value);
      const prevValues = prevReadings.map(r => r.value);

      const currentAvg = currentValues.length > 0 
        ? currentValues.reduce((a, b) => a + b, 0) / currentValues.length 
        : null;
      const previousAvg = prevValues.length > 0 
        ? prevValues.reduce((a, b) => a + b, 0) / prevValues.length 
        : null;

      let trend: 'up' | 'down' | 'stable' | null = null;
      if (currentAvg !== null && previousAvg !== null) {
        const change = ((currentAvg - previousAvg) / previousAvg) * 100;
        if (Math.abs(change) < 5) trend = 'stable';
        else if (change > 0) trend = 'up';
        else trend = 'down';
      }

      stats[metricId] = {
        currentAvg,
        previousAvg,
        trend,
        min: currentValues.length > 0 ? Math.min(...currentValues) : null,
        max: currentValues.length > 0 ? Math.max(...currentValues) : null,
        count: currentValues.length,
      };
    });

    return stats;
  }, [readings, previousWeekReadings, currentWeekStart, currentWeekEnd]);

  // Missing days count
  const missingDays = useMemo(() => {
    return weekDays.filter(day => {
      if (isToday(day) || day > new Date()) return false;
      const dayKey = format(day, 'yyyy-MM-dd');
      return readingsByDay[dayKey]?.length === 0;
    });
  }, [weekDays, readingsByDay]);

  // Completion percentage
  const completionPercentage = useMemo(() => {
    const pastDays = weekDays.filter(day => day <= new Date() && !isToday(day));
    if (pastDays.length === 0) return 100;
    const daysWithReadings = pastDays.filter(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      return readingsByDay[dayKey]?.length > 0;
    });
    return Math.round((daysWithReadings.length / pastDays.length) * 100);
  }, [weekDays, readingsByDay]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-status-warning" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-primary" />;
    if (trend === 'stable') return <Minus className="w-4 h-4 text-status-normal" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Week header with completion */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Weekly Summary</h2>
          <p className="text-sm text-muted-foreground">
            {format(currentWeekStart, 'MMM d')} – {format(currentWeekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={cn(
              "text-2xl font-bold",
              completionPercentage === 100 ? "text-status-normal" :
              completionPercentage >= 70 ? "text-status-warning" :
              "text-status-critical"
            )}>
              {completionPercentage}%
            </div>
            <div className="text-xs text-muted-foreground">Completion</div>
          </div>
          {missingDays.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-warning/10 border border-status-warning/30">
              <AlertCircle className="w-4 h-4 text-status-warning" />
              <span className="text-sm text-status-warning font-medium">
                {missingDays.length} missing day{missingDays.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Day-by-day calendar strip */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Daily Activity</h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayReadings = readingsByDay[dayKey] || [];
            const isFutureDay = day > new Date();
            const isTodayDay = isToday(day);
            const hasMissingReadings = !isFutureDay && !isTodayDay && dayReadings.length === 0;
            const metricsRecorded = new Set(dayReadings.map(r => r.metric_id)).size;

            return (
              <button
                key={dayKey}
                onClick={() => onDayClick?.(day)}
                disabled={isFutureDay}
                className={cn(
                  "flex flex-col items-center p-3 rounded-lg transition-all",
                  isTodayDay && "ring-2 ring-primary",
                  isFutureDay && "opacity-40 cursor-not-allowed",
                  hasMissingReadings && "bg-status-critical/10 border border-status-critical/30",
                  !hasMissingReadings && !isFutureDay && dayReadings.length > 0 && "bg-status-normal/10 border border-status-normal/30",
                  !hasMissingReadings && !isFutureDay && dayReadings.length === 0 && isTodayDay && "bg-primary/10 border border-primary/30",
                  !isFutureDay && "hover:bg-accent cursor-pointer"
                )}
              >
                <span className="text-xs text-muted-foreground">{format(day, 'EEE')}</span>
                <span className={cn(
                  "text-lg font-semibold",
                  isTodayDay && "text-primary",
                  hasMissingReadings && "text-status-critical"
                )}>
                  {format(day, 'd')}
                </span>
                <div className="mt-1">
                  {isFutureDay ? (
                    <span className="text-xs text-muted-foreground">–</span>
                  ) : hasMissingReadings ? (
                    <AlertCircle className="w-4 h-4 text-status-critical" />
                  ) : dayReadings.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-status-normal" />
                      <span className="text-xs text-muted-foreground">{metricsRecorded}</span>
                    </div>
                  ) : isTodayDay ? (
                    <Calendar className="w-4 h-4 text-primary" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric trends */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Metric Trends (vs. Last Week)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metricOrder.map(metricId => {
            const metric = METRICS[metricId];
            const stats = weeklyMetricStats[metricId];

            return (
              <div 
                key={metricId}
                className="p-3 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{metric.name}</span>
                  {getTrendIcon(stats.trend)}
                </div>
                
                {stats.currentAvg !== null ? (
                  <>
                    <div className="text-xl font-mono font-semibold text-foreground">
                      {stats.currentAvg.toFixed(metric.precision)} 
                      <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Range: {stats.min?.toFixed(metric.precision)} – {stats.max?.toFixed(metric.precision)}</span>
                    </div>
                    {stats.previousAvg !== null && (
                      <div className={cn(
                        "text-xs mt-1",
                        stats.trend === 'up' && "text-status-warning",
                        stats.trend === 'down' && "text-primary",
                        stats.trend === 'stable' && "text-status-normal"
                      )}>
                        {stats.trend === 'stable' ? 'Stable' : 
                         stats.trend === 'up' ? '↑ Increased' : '↓ Decreased'} from {stats.previousAvg.toFixed(metric.precision)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No readings this week
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-2">
                  {stats.count} reading{stats.count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Missing days detail */}
      {missingDays.length > 0 && (
        <div className="bg-status-warning/5 rounded-xl border border-status-warning/20 p-4">
          <h3 className="text-sm font-medium text-status-warning mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Missing Readings
          </h3>
          <div className="flex flex-wrap gap-2">
            {missingDays.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick?.(day)}
                className="px-3 py-1.5 rounded-lg bg-status-warning/10 hover:bg-status-warning/20 border border-status-warning/30 text-sm text-status-warning transition-colors"
              >
                {format(day, 'EEE, MMM d')}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Click on a day to add readings for that date
          </p>
        </div>
      )}
    </div>
  );
}
