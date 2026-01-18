import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { Reading, Threshold, PARAMETERS, ParameterKey, getDefaultThresholds } from '@/types/wastewater';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
interface MetricChartProps {
  metricId: ParameterKey;
  readings: Reading[];
  threshold?: Threshold;
  days?: number;
  showThresholdBands?: boolean;
}

export function MetricChart({ 
  metricId, 
  readings, 
  threshold,
  days = 30,
  showThresholdBands = true 
}: MetricChartProps) {
  const param = PARAMETERS[metricId];
  const defaults = getDefaultThresholds(param);
  const isMobile = useIsMobile();
  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = readings
      .filter(r => r.metricId === metricId && r.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate rolling average
    return filtered.map((reading, index) => {
      const windowStart = Math.max(0, index - 6);
      const window = filtered.slice(windowStart, index + 1);
      const avg = window.reduce((sum, r) => sum + r.value, 0) / window.length;

      return {
        date: reading.timestamp,
        value: reading.value,
        rollingAvg: Number(avg.toFixed(param.decimals)),
        min: threshold?.min ?? defaults.min,
        max: threshold?.max ?? defaults.max,
      };
    });
  }, [readings, metricId, threshold, days, param, defaults]);

  const domain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    const values = chartData.map(d => d.value);
    const min = Math.min(...values, threshold?.min ?? defaults.min);
    const max = Math.max(...values, threshold?.max ?? defaults.max);
    const padding = (max - min) * 0.1;
    
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, threshold, defaults]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div className="glass-panel p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">
          {format(new Date(label), 'MMM d, yyyy')}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm">
              <span className="font-mono font-medium">{data.value}</span>
              <span className="text-muted-foreground ml-1">{param.unit}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-status-info" />
            <span className="text-sm text-muted-foreground">
              7d avg: <span className="font-mono">{data.rollingAvg}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 min-w-0 overflow-hidden flex items-center justify-center text-muted-foreground">
        No data available for the selected period
      </div>
    );
  }

  return (
    <div className="h-64 w-full min-w-0 overflow-hidden [&_.recharts-responsive-container]:min-w-0 [&_.recharts-wrapper]:overflow-hidden [&_.recharts-surface]:overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: isMobile ? 6 : 10, left: isMobile ? 6 : 0, bottom: isMobile ? 12 : 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${metricId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--chart-grid))" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'M/d')}
            stroke="hsl(var(--muted-foreground))"
            fontSize={isMobile ? 10 : 11}
            tickMargin={8}
            minTickGap={isMobile ? 18 : 24}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis 
            domain={domain}
            width={isMobile ? 36 : 44}
            stroke="hsl(var(--muted-foreground))"
            fontSize={isMobile ? 10 : 11}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toFixed(param.decimals > 0 ? 1 : 0)}
          />
          
          <Tooltip content={<CustomTooltip />} />

          {/* Threshold reference lines */}
          {showThresholdBands && (
            <>
              <ReferenceLine 
                y={threshold?.max ?? defaults.max} 
                stroke="hsl(var(--status-warning))" 
                strokeDasharray="5 5"
                label={
                  isMobile
                    ? undefined
                    : {
                        value: 'Max',
                        position: 'right',
                        fill: 'hsl(var(--status-warning))',
                        fontSize: 10,
                      }
                }
              />
              <ReferenceLine 
                y={threshold?.min ?? defaults.min} 
                stroke="hsl(var(--status-warning))" 
                strokeDasharray="5 5"
                label={
                  isMobile
                    ? undefined
                    : {
                        value: 'Min',
                        position: 'right',
                        fill: 'hsl(var(--status-warning))',
                        fontSize: 10,
                      }
                }
              />
            </>
          )}

          {/* Area under line */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="transparent"
            fill={`url(#gradient-${metricId})`}
          />

          {/* Rolling average line */}
          <Line
            type="monotone"
            dataKey="rollingAvg"
            stroke="hsl(var(--status-info))"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />

          {/* Main value line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ 
              fill: 'hsl(var(--primary))', 
              strokeWidth: 0,
              r: 3
            }}
            activeDot={{ 
              fill: 'hsl(var(--primary))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
              r: 6
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
