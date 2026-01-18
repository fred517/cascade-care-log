import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSite } from '@/hooks/useSite';
import { useReadings } from '@/hooks/useReadings';
import { useLatestWeatherSnapshot, useWeatherSnapshots } from '@/hooks/useWeatherSnapshots';
import { PARAMETERS, METRICS, ParameterKey, MetricType, DailyStatus, Reading, Threshold, AlertEvent, PARAMETER_LIST } from '@/types/wastewater';
import { supabase } from '@/integrations/supabase/client';
import { MetricChart } from '@/components/charts/MetricChart';
import { WeatherCard } from '@/components/environment/WeatherCard';
import { WeatherTrendChart } from '@/components/environment/WeatherTrendChart';
import { EnvironmentSummary } from '@/components/environment/EnvironmentSummary';
import { AlertsOverview } from '@/components/environment/AlertsOverview';
import { ParameterTrendGrid } from '@/components/environment/ParameterTrendGrid';
import { Loader2, RefreshCw, Cloud, Droplets, Thermometer, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect } from 'react';

const EnvironmentMonitor = () => {
  const { profile } = useAuth();
  const { site, loading: siteLoading } = useSite();
  const { readings, thresholds, loading: readingsLoading, getMetricThreshold, refetch: refetchReadings } = useReadings();
  const { data: latestWeather, isLoading: weatherLoading, refetch: refetchWeather } = useLatestWeatherSnapshot();
  const { data: weatherHistory } = useWeatherSnapshots(48);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<7 | 30 | 90>(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch active alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('alert_events')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(10);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchReadings(), refetchWeather()]);
    setIsRefreshing(false);
  };

  const loading = siteLoading || readingsLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading environmental data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Cloud className="w-8 h-8 text-primary" />
              Environmental Monitor
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time weather conditions and water quality trends
              {site && <span className="ml-2">• {site.name}</span>}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Environment Summary */}
        <EnvironmentSummary 
          statuses={dailyStatuses} 
          alerts={alerts}
          weather={latestWeather}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Weather
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Water Quality
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weather Card */}
              <div className="lg:col-span-1">
                <WeatherCard weather={latestWeather} loading={weatherLoading} />
              </div>
              
              {/* Alerts Overview */}
              <div className="lg:col-span-2">
                <AlertsOverview alerts={alerts} statuses={dailyStatuses} />
              </div>
            </div>

            {/* Parameter Trends Grid */}
            <ParameterTrendGrid
              readings={chartReadings}
              thresholds={chartThresholds}
              statuses={dailyStatuses}
              days={selectedTimeRange}
              onTimeRangeChange={setSelectedTimeRange}
            />
          </TabsContent>

          {/* Weather Tab */}
          <TabsContent value="weather" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeatherCard weather={latestWeather} loading={weatherLoading} expanded />
              <WeatherTrendChart weatherHistory={weatherHistory || []} />
            </div>
          </TabsContent>

          {/* Water Quality Tab */}
          <TabsContent value="quality" className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Time Range:</span>
              <div className="flex gap-1">
                {([7, 30, 90] as const).map(days => (
                  <Button
                    key={days}
                    variant={selectedTimeRange === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeRange(days)}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>

            {/* Full Parameter Grid */}
            <ParameterTrendGrid
              readings={chartReadings}
              thresholds={chartThresholds}
              statuses={dailyStatuses}
              days={selectedTimeRange}
              onTimeRangeChange={setSelectedTimeRange}
              showAll
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default EnvironmentMonitor;
