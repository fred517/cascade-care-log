export type MetricType = 'svi' | 'ph' | 'do' | 'orp' | 'mlss' | 'ammonia';

export type AlertSeverity = 'low' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Metric {
  id: MetricType;
  name: string;
  unit: string;
  description: string;
  defaultMin: number;
  defaultMax: number;
  precision: number;
  color: string;
}

export interface Reading {
  id: string;
  metricId: MetricType;
  value: number;
  timestamp: Date;
  enteredBy: string;
  notes?: string;
  siteId: string;
}

export interface Threshold {
  metricId: MetricType;
  min: number;
  max: number;
  enabled: boolean;
  siteId: string;
}

export interface AlertEvent {
  id: string;
  metricId: MetricType;
  readingId: string;
  value: number;
  threshold: number;
  type: 'low' | 'high';
  severity: AlertSeverity;
  triggeredAt: Date;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  siteId: string;
}

export interface ActionPlaybook {
  id: string;
  metricId: MetricType;
  condition: 'low' | 'high';
  title: string;
  steps: string[];
  references: string[];
}

export interface Site {
  id: string;
  name: string;
  timezone: string;
  orgId: string;
}

export interface DailyStatus {
  metricId: MetricType;
  latestValue: number | null;
  status: 'normal' | 'warning' | 'critical' | 'missing';
  lastUpdated: Date | null;
  trend: 'rising' | 'stable' | 'falling' | null;
}

export const METRICS: Record<MetricType, Metric> = {
  svi: {
    id: 'svi',
    name: 'SVI',
    unit: 'mL/g',
    description: 'Sludge Volume Index - settling characteristics',
    defaultMin: 50,
    defaultMax: 150,
    precision: 0,
    color: 'metric-svi',
  },
  ph: {
    id: 'ph',
    name: 'pH',
    unit: '',
    description: 'Acidity/Alkalinity level',
    defaultMin: 6.5,
    defaultMax: 8.5,
    precision: 2,
    color: 'metric-ph',
  },
  do: {
    id: 'do',
    name: 'DO',
    unit: 'mg/L',
    description: 'Dissolved Oxygen level',
    defaultMin: 2.0,
    defaultMax: 8.0,
    precision: 1,
    color: 'metric-do',
  },
  orp: {
    id: 'orp',
    name: 'ORP',
    unit: 'mV',
    description: 'Oxidation-Reduction Potential',
    defaultMin: -50,
    defaultMax: 200,
    precision: 0,
    color: 'metric-orp',
  },
  mlss: {
    id: 'mlss',
    name: 'MLSS',
    unit: 'mg/L',
    description: 'Mixed Liquor Suspended Solids',
    defaultMin: 2000,
    defaultMax: 4000,
    precision: 0,
    color: 'metric-mlss',
  },
  ammonia: {
    id: 'ammonia',
    name: 'Ammonia',
    unit: 'mg/L',
    description: 'Ammonia nitrogen concentration',
    defaultMin: 0,
    defaultMax: 5,
    precision: 2,
    color: 'metric-ammonia',
  },
};
