import { WeatherSnapshot } from '@/hooks/useWeatherSnapshots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wind, Thermometer, Compass, CloudSun, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface WeatherCardProps {
  weather: WeatherSnapshot | null | undefined;
  loading?: boolean;
  expanded?: boolean;
}

const getWindDirection = (degrees: number | null): string => {
  if (degrees === null) return '--';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const getStabilityDescription = (stabilityClass: string | null): { label: string; description: string; color: string } => {
  const classes: Record<string, { label: string; description: string; color: string }> = {
    A: { label: 'Very Unstable', description: 'Strong mixing, good dispersion', color: 'text-status-normal' },
    B: { label: 'Unstable', description: 'Moderate mixing', color: 'text-status-normal' },
    C: { label: 'Slightly Unstable', description: 'Light mixing', color: 'text-status-info' },
    D: { label: 'Neutral', description: 'Moderate conditions', color: 'text-muted-foreground' },
    E: { label: 'Slightly Stable', description: 'Limited mixing', color: 'text-status-warning' },
    F: { label: 'Stable', description: 'Poor dispersion', color: 'text-status-critical' },
  };
  return classes[stabilityClass || ''] || { label: 'Unknown', description: 'No data available', color: 'text-muted-foreground' };
};

export function WeatherCard({ weather, loading, expanded = false }: WeatherCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="w-5 h-5" />
            Current Weather
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="w-5 h-5" />
            Current Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CloudSun className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No weather data available</p>
            <p className="text-sm mt-1">Weather snapshots will appear here once collected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stability = getStabilityDescription(weather.stability_class);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-primary" />
            Current Weather
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {format(new Date(weather.recorded_at), 'HH:mm')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature - Main Display */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Thermometer className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Temperature</p>
              <p className="text-3xl font-bold">
                {weather.temperature_c !== null ? `${weather.temperature_c.toFixed(1)}°C` : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Wind Information */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Wind className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Wind Speed</span>
            </div>
            <p className="text-xl font-semibold">
              {weather.wind_speed_mps !== null ? `${weather.wind_speed_mps.toFixed(1)} m/s` : '--'}
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Direction</span>
            </div>
            <p className="text-xl font-semibold">
              {getWindDirection(weather.wind_direction_deg)}
              {weather.wind_direction_deg !== null && (
                <span className="text-sm text-muted-foreground ml-1">({weather.wind_direction_deg}°)</span>
              )}
            </p>
          </div>
        </div>

        {/* Atmospheric Stability */}
        {expanded && (
          <div className="p-3 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Atmospheric Stability</span>
              <span className={cn("text-sm font-semibold px-2 py-0.5 rounded", stability.color)}>
                Class {weather.stability_class || '--'}
              </span>
            </div>
            <p className={cn("text-lg font-semibold", stability.color)}>{stability.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{stability.description}</p>
          </div>
        )}

        {/* Compact Stability Indicator */}
        {!expanded && weather.stability_class && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stability Class</span>
            <span className={cn("font-semibold", stability.color)}>
              {weather.stability_class} - {stability.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
