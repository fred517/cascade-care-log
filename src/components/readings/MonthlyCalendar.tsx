import { useMemo, useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isFuture
} from 'date-fns';
import { METRICS, MetricType } from '@/types/wastewater';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

interface MonthlyCalendarProps {
  readings: Reading[];
  onDayClick?: (date: Date) => void;
}

type DayStatus = 'complete' | 'partial' | 'missing' | 'future' | 'today-pending';

const metricOrder: MetricType[] = ['svi', 'ph', 'do', 'orp', 'mlss', 'ammonia_tan'];

export function MonthlyCalendar({ readings, onDayClick }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get calendar grid (includes days from prev/next month to fill weeks)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = useMemo(() => 
    eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  // Get readings for each day
  const readingsByDay = useMemo(() => {
    const byDay: Record<string, Reading[]> = {};
    calendarDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      byDay[dayKey] = readings.filter(r => {
        const readingDate = new Date(r.recorded_at);
        return isSameDay(readingDate, day);
      });
    });
    return byDay;
  }, [readings, calendarDays]);

  // Calculate status for each day
  const getDayStatus = (day: Date): DayStatus => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayReadings = readingsByDay[dayKey] || [];
    const uniqueMetrics = new Set(dayReadings.map(r => r.metric_id));
    
    if (isFuture(day) && !isToday(day)) return 'future';
    if (isToday(day) && dayReadings.length === 0) return 'today-pending';
    if (dayReadings.length === 0) return 'missing';
    if (uniqueMetrics.size >= metricOrder.length) return 'complete';
    return 'partial';
  };

  // Monthly stats
  const monthStats = useMemo(() => {
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const pastDays = daysInMonth.filter(day => !isFuture(day) || isToday(day));
    const pastDaysExcludingToday = pastDays.filter(day => !isToday(day));
    
    let complete = 0;
    let partial = 0;
    let missing = 0;
    
    pastDaysExcludingToday.forEach(day => {
      const status = getDayStatus(day);
      if (status === 'complete') complete++;
      else if (status === 'partial') partial++;
      else if (status === 'missing') missing++;
    });

    return {
      totalDays: pastDaysExcludingToday.length,
      complete,
      partial,
      missing,
      completionRate: pastDaysExcludingToday.length > 0 
        ? Math.round(((complete + partial) / pastDaysExcludingToday.length) * 100)
        : 100
    };
  }, [monthStart, monthEnd, readingsByDay]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToCurrentMonth = () => setCurrentMonth(new Date());

  const getStatusStyles = (status: DayStatus) => {
    switch (status) {
      case 'complete':
        return 'bg-status-normal/20 border-status-normal/40 text-status-normal';
      case 'partial':
        return 'bg-status-warning/20 border-status-warning/40 text-status-warning';
      case 'missing':
        return 'bg-status-critical/20 border-status-critical/40 text-status-critical';
      case 'today-pending':
        return 'bg-primary/20 border-primary/40 text-primary';
      case 'future':
        return 'bg-muted/30 border-transparent text-muted-foreground/50';
      default:
        return 'bg-muted/30 border-transparent';
    }
  };

  const getStatusIcon = (status: DayStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'partial':
        return <Minus className="w-3.5 h-3.5" />;
      case 'missing':
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextMonth}
            disabled={isSameMonth(currentMonth, new Date()) || isFuture(startOfMonth(addMonths(currentMonth, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {!isSameMonth(currentMonth, new Date()) && (
          <Button variant="secondary" size="sm" onClick={goToCurrentMonth}>
            Today
          </Button>
        )}
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className={cn(
            "text-3xl font-bold",
            monthStats.completionRate >= 90 ? "text-status-normal" :
            monthStats.completionRate >= 70 ? "text-status-warning" :
            "text-status-critical"
          )}>
            {monthStats.completionRate}%
          </div>
          <div className="text-sm text-muted-foreground">Overall Coverage</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-3xl font-bold text-status-normal">{monthStats.complete}</div>
          <div className="text-sm text-muted-foreground">Complete Days</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-3xl font-bold text-status-warning">{monthStats.partial}</div>
          <div className="text-sm text-muted-foreground">Partial Days</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-3xl font-bold text-status-critical">{monthStats.missing}</div>
          <div className="text-sm text-muted-foreground">Missing Days</div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-card rounded-xl border border-border p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayReadings = readingsByDay[dayKey] || [];
            const uniqueMetrics = new Set(dayReadings.map(r => r.metric_id));
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const status = getDayStatus(day);
            const isTodayDay = isToday(day);
            const isFutureDay = isFuture(day) && !isTodayDay;

            return (
              <button
                key={dayKey}
                onClick={() => !isFutureDay && onDayClick?.(day)}
                disabled={isFutureDay}
                className={cn(
                  "relative aspect-square p-1 rounded-lg border transition-all flex flex-col items-center justify-center",
                  !isCurrentMonth && "opacity-40",
                  isTodayDay && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  getStatusStyles(status),
                  !isFutureDay && "hover:scale-105 hover:shadow-md cursor-pointer",
                  isFutureDay && "cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "text-sm font-semibold",
                  !isCurrentMonth && "text-muted-foreground/50"
                )}>
                  {format(day, 'd')}
                </span>
                
                {isCurrentMonth && !isFutureDay && (
                  <div className="mt-0.5">
                    {getStatusIcon(status)}
                  </div>
                )}
                
                {isCurrentMonth && !isFutureDay && dayReadings.length > 0 && (
                  <div className="text-[10px] font-medium mt-0.5">
                    {uniqueMetrics.size}/{metricOrder.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-normal/20 border border-status-normal/40 flex items-center justify-center">
            <CheckCircle2 className="w-2.5 h-2.5 text-status-normal" />
          </div>
          <span className="text-muted-foreground">Complete (all metrics)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-warning/20 border border-status-warning/40 flex items-center justify-center">
            <Minus className="w-2.5 h-2.5 text-status-warning" />
          </div>
          <span className="text-muted-foreground">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-critical/20 border border-status-critical/40 flex items-center justify-center">
            <AlertCircle className="w-2.5 h-2.5 text-status-critical" />
          </div>
          <span className="text-muted-foreground">Missing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/20 border border-primary/40" />
          <span className="text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}
