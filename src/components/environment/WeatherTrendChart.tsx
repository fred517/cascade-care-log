import { WeatherSnapshot } from '@/hooks/useWeatherSnapshots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Wind, Thermometer } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface WeatherTrendChartProps {
  weatherHistory: WeatherSnapshot[];
}

export function WeatherTrendChart({ weatherHistory }: WeatherTrendChartProps) {
  const chartData = useMemo(() => {
    return weatherHistory
      .slice()
      .reverse()
      .map(w => ({
        time: format(new Date(w.recorded_at), 'HH:mm'),
        fullTime: format(new Date(w.recorded_at), 'MMM d, HH:mm'),
        temperature: w.temperature_c,
        windSpeed: w.wind_speed_mps,
        windDirection: w.wind_direction_deg,
      }));
  }, [weatherHistory]);

  const chartConfig = {
    temperature: {
      label: "Temperature (°C)",
      color: "hsl(var(--chart-1))",
    },
    windSpeed: {
      label: "Wind Speed (m/s)",
      color: "hsl(var(--chart-2))",
    },
  };

  if (weatherHistory.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Weather Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No historical weather data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Weather Trends (Last 48 Hours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="temp"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}°`}
              />
              <YAxis 
                yAxisId="wind"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullTime || label;
                    }}
                  />
                }
              />
              <Legend />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="wind"
                type="monotone"
                dataKey="windSpeed"
                name="Wind Speed (m/s)"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
