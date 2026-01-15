import { useState } from 'react';
import { format, isToday, isFuture, startOfDay } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReadingForm } from '@/components/readings/ReadingForm';
import { Reading, MetricType, Threshold, METRICS } from '@/types/wastewater';
import { useReadings } from '@/hooks/useReadings';
import { useSite } from '@/hooks/useSite';
import { Clock, Loader2, CalendarIcon, ChevronLeft, ChevronRight, History, AlertTriangle, Paperclip, ExternalLink } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Readings() {
  const { site, loading: siteLoading } = useSite();
  const { thresholds, addMultipleReadings, getReadingsForDate, uploadAttachment, loading: readingsLoading } = useReadings();
  const [recentSubmissions, setRecentSubmissions] = useState<Reading[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isSelectedToday = isToday(selectedDate);
  const isSelectedFuture = isFuture(startOfDay(selectedDate));
  const existingReadings = getReadingsForDate(selectedDate);

  const handleSubmit = async (readings: Omit<Reading, 'id'>[]) => {
    const readingsData = readings.map(r => ({
      metricId: r.metricId,
      value: r.value,
      notes: r.notes,
      attachmentUrl: r.attachmentUrl,
    }));

    // Use selected date with current time for recording
    const recordDate = new Date(selectedDate);
    if (isSelectedToday) {
      // For today, use current time
      const now = new Date();
      recordDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
      // For past dates, set to noon to avoid timezone issues
      recordDate.setHours(12, 0, 0, 0);
    }

    const savedReadings = await addMultipleReadings(readingsData, recordDate);
    
    const newReadings = savedReadings.map((r) => ({
      id: r.id,
      metricId: r.metric_id as MetricType,
      value: Number(r.value),
      timestamp: new Date(r.recorded_at),
      enteredBy: 'You',
      siteId: r.site_id,
      notes: r.notes || undefined,
    }));
    
    setRecentSubmissions(prev => [...newReadings, ...prev].slice(0, 10));
  };

  const formThresholds: Threshold[] = thresholds.map(t => ({
    metricId: t.metric_id as MetricType,
    min: t.min_value,
    max: t.max_value,
    enabled: t.enabled,
    siteId: t.site_id,
  }));

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (!isFuture(startOfDay(next))) {
      setSelectedDate(next);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const loading = siteLoading || readingsLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isSelectedToday ? 'Add Daily Readings' : 'Historical Readings'}
          </h1>
          <p className="text-muted-foreground">
            {isSelectedToday 
              ? 'Enter today\'s process measurements for all metrics'
              : 'View or add readings for a past date'
            }
            {site && <span className="ml-1">at {site.name}</span>}
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date && !isFuture(startOfDay(date))) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => isFuture(startOfDay(date))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              disabled={isSelectedToday}
              className="h-10 w-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isSelectedToday && (
            <Button
              variant="secondary"
              onClick={goToToday}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Back to Today
            </Button>
          )}
        </div>

        {/* Date indicator */}
        <div className={cn(
          "flex items-center gap-2 mb-6 p-3 rounded-lg border",
          isSelectedToday 
            ? "bg-primary/10 border-primary/30" 
            : "bg-accent border-accent"
        )}>
          {isSelectedToday ? (
            <Clock className="w-5 h-5 text-primary" />
          ) : (
            <History className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-sm">
            {isSelectedToday ? 'Recording for: ' : 'Viewing/Adding readings for: '}
            <span className="font-semibold text-foreground">
              {format(selectedDate, isSelectedToday 
                ? "EEEE, MMMM d, yyyy 'at' h:mm a"
                : "EEEE, MMMM d, yyyy"
              )}
            </span>
          </span>
        </div>

        {/* Warning for future dates */}
        {isSelectedFuture && (
          <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-sm text-destructive">
              Cannot add readings for future dates
            </span>
          </div>
        )}

        {/* Existing readings for selected date */}
        {existingReadings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <History className="w-5 h-5" />
              Existing Readings for {format(selectedDate, 'MMM d')}
            </h2>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {existingReadings.map((reading) => {
                  const metric = METRICS[reading.metric_id as MetricType];
                  return (
                    <div 
                      key={reading.id}
                      className="p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {metric?.name || reading.metric_id}
                      </div>
                      <div className="text-lg font-mono text-foreground">
                        {reading.value} {metric?.unit || ''}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(reading.recorded_at), 'h:mm a')}
                      </div>
                      {reading.notes && (
                        <div className="text-xs text-muted-foreground mt-2 italic">
                          {reading.notes}
                        </div>
                      )}
                      {reading.attachment_url && (
                        <a 
                          href={reading.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                        >
                          <Paperclip className="w-3 h-3" />
                          View attachment
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!isSelectedFuture && (
          <>
            {existingReadings.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Add More Readings
                </h2>
                <p className="text-sm text-muted-foreground">
                  You can add additional readings for this date
                </p>
              </div>
            )}
            <ReadingForm onSubmit={handleSubmit} thresholds={formThresholds} onUploadFile={uploadAttachment} />
          </>
        )}

        {/* Recent Submissions */}
        {recentSubmissions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Just Submitted</h2>
            <div className="bg-status-normal/10 border border-status-normal/30 rounded-xl p-4">
              <div className="flex flex-wrap gap-3">
                {recentSubmissions.slice(0, 6).map((reading, index) => (
                  <div 
                    key={reading.id}
                    className="px-3 py-2 rounded-lg bg-card border border-border animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {reading.metricId.toUpperCase()}:
                    </span>
                    <span className="text-sm text-muted-foreground ml-2 font-mono">
                      {reading.value}
                    </span>
                    {!isToday(reading.timestamp) && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({format(reading.timestamp, 'MMM d')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
