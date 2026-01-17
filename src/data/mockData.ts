import { Reading, Threshold, AlertEvent, ActionPlaybook, DailyStatus, MetricType, METRICS } from '@/types/wastewater';

// Generate mock readings for the past 30 days
const generateMockReadings = (): Reading[] => {
  const readings: Reading[] = [];
  const now = new Date();
  
  const metricRanges: Partial<Record<MetricType, { base: number; variance: number }>> = {
    svi: { base: 100, variance: 40 },
    ph: { base: 7.2, variance: 0.8 },
    do: { base: 3.5, variance: 1.5 },
    orp: { base: 75, variance: 80 },
    mlss: { base: 3000, variance: 800 },
    ammonia_tan: { base: 2.5, variance: 2 },
  };

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(8, 0, 0, 0);

    Object.keys(METRICS).forEach((metricId) => {
      const metric = metricId as MetricType;
      const { base, variance } = metricRanges[metric];
      const value = Math.max(0, base + (Math.random() - 0.5) * variance * 2);
      
      readings.push({
        id: `reading-${metric}-${day}`,
        metricId: metric,
        value: Number(value.toFixed(METRICS[metric].precision)),
        timestamp: date,
        enteredBy: 'John Operator',
        siteId: 'site-1',
        notes: day === 0 && metric === 'svi' ? 'Good settling observed' : undefined,
      });
    });
  }

  return readings;
};

export const mockReadings = generateMockReadings();

export const mockThresholds: Threshold[] = Object.values(METRICS).map((metric) => ({
  metricId: metric.id,
  min: metric.defaultMin,
  max: metric.defaultMax,
  enabled: true,
  siteId: 'site-1',
}));

export const mockAlerts: AlertEvent[] = [
  {
    id: 'alert-1',
    metricId: 'do',
    readingId: 'reading-do-2',
    value: 1.4,
    threshold: 2.0,
    type: 'low',
    severity: 'critical',
    triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'active',
    siteId: 'site-1',
  },
  {
    id: 'alert-2',
    metricId: 'svi',
    readingId: 'reading-svi-5',
    value: 185,
    threshold: 150,
    type: 'high',
    severity: 'high',
    triggeredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'acknowledged',
    acknowledgedBy: 'Jane Supervisor',
    acknowledgedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    siteId: 'site-1',
  },
];

export const mockPlaybooks: ActionPlaybook[] = [
  {
    id: 'playbook-do-low',
    metricId: 'do',
    condition: 'low',
    title: 'Low DO Response - Nitrification Risk',
    steps: [
      'Increase blower runtime or start additional blowers if available',
      'Check diffusers for fouling, air header leaks, or broken laterals',
      'Verify air pressure and flow rates at blower discharge',
      'Check recirculation rates and influent/return load spikes',
      'Inspect for unusual odor/color changes and correlate with BOD/load',
      'Document observations and notify supervisor if condition persists',
    ],
    references: [
      'PCA Minnesota Wastewater Operations Guide',
      'Environmental Protection Authority Guidelines',
    ],
  },
  {
    id: 'playbook-do-high',
    metricId: 'do',
    condition: 'high',
    title: 'High DO Response - Over-aeration',
    steps: [
      'Reduce blower runtime or throttle air valves',
      'Check for process upsets causing reduced oxygen demand',
      'Verify probe calibration with grab sample',
      'Document energy savings opportunity',
    ],
    references: ['Plant-specific SOP'],
  },
  {
    id: 'playbook-ph-low',
    metricId: 'ph',
    condition: 'low',
    title: 'Low pH Response - Acidic Conditions',
    steps: [
      'Confirm probe calibration with grab-bottle sample verification',
      'Investigate potential industrial discharge or toxicity source',
      'Check alkalinity availability - nitrification consumes alkalinity',
      'Consider adding alkalinity supplement if permitted',
      'Document and report any unusual influent characteristics',
    ],
    references: [
      'michigan.gov Wastewater pH Guidelines',
      'PCA Minnesota Nitrification Guide',
    ],
  },
  {
    id: 'playbook-ph-high',
    metricId: 'ph',
    condition: 'high',
    title: 'High pH Response - Basic Conditions',
    steps: [
      'Confirm probe calibration with grab-bottle sample verification',
      'Investigate potential industrial discharge',
      'Check for chemical overdosing in treatment process',
      'Review recent chemical additions',
    ],
    references: ['michigan.gov Wastewater pH Guidelines'],
  },
  {
    id: 'playbook-svi-high',
    metricId: 'svi',
    condition: 'high',
    title: 'High SVI Response - Bulking/Poor Settling',
    steps: [
      'Verify SV30 test quality (proper mixing, 30-min settle time, clean cylinder)',
      'Consider dilution if initial reading exceeds cylinder capacity',
      'Inspect sludge under microscope for filament dominance',
      'Review F/M ratio, DO levels, and nutrient balance',
      'Record foam/bulking observations with photos',
      'Consider selector zone or RAS chlorination if chronic',
    ],
    references: [
      'DEP Files - SVI Training Module',
      'Wastewater Microbiology Manual',
    ],
  },
  {
    id: 'playbook-svi-low',
    metricId: 'svi',
    condition: 'low',
    title: 'Low SVI Response - Dense Sludge',
    steps: [
      'Verify MLSS is accurate (low SVI with low MLSS is normal)',
      'Check for pin floc or dispersed growth',
      'Monitor clarifier performance for any issues',
    ],
    references: ['DEP Files - SVI Training Module'],
  },
  {
    id: 'playbook-mlss-low',
    metricId: 'mlss',
    condition: 'low',
    title: 'Low MLSS Response - Biomass Deficit',
    steps: [
      'Check wasting rate - reduce if too aggressive',
      'Verify RAS rate is adequate',
      'Inspect clarifier for solids loss over weirs',
      'Check for hydraulic overload conditions',
      'Review recent process upsets or toxic events',
    ],
    references: ['Activated Sludge Process Control Manual'],
  },
  {
    id: 'playbook-mlss-high',
    metricId: 'mlss',
    condition: 'high',
    title: 'High MLSS Response - Excess Inventory',
    steps: [
      'Increase wasting rate gradually',
      'Monitor clarifier sludge blanket depth',
      'Check SVI/settleability before aggressive wasting',
      'Verify clarifier capacity is not exceeded',
      'Document sludge age calculations',
    ],
    references: ['Activated Sludge Process Control Manual'],
  },
  {
    id: 'playbook-ammonia-high',
    metricId: 'ammonia',
    condition: 'high',
    title: 'High Ammonia Response - Nitrification Issue',
    steps: [
      'Check DO across entire aeration zone - target minimum 2.0 mg/L',
      'Verify pH and alkalinity sufficiency (nitrification needs alkalinity)',
      'Check equipment health: diffusers, blowers, recirc patterns',
      'Review influent loading for shock loads',
      'Record temperature - cold temps slow nitrification',
      'Consider increasing SRT if nitrifier washout suspected',
    ],
    references: [
      'PCA Minnesota Nitrification Troubleshooting',
      'MCET Nitrification Guidelines',
    ],
  },
  {
    id: 'playbook-orp-low',
    metricId: 'orp',
    condition: 'low',
    title: 'Low ORP Response - Reducing Conditions',
    steps: [
      'Verify probe calibration and cleanliness',
      'Check DO levels - low ORP often correlates with low DO',
      'Look for septic conditions or sulfide generation',
      'Increase aeration if appropriate',
    ],
    references: ['Clean Water Professionals ORP Guide'],
  },
  {
    id: 'playbook-orp-high',
    metricId: 'orp',
    condition: 'high',
    title: 'High ORP Response - Oxidizing Conditions',
    steps: [
      'Verify probe calibration',
      'Check for over-aeration or chlorine residual',
      'May indicate good nitrification - correlate with ammonia',
      'Document as potential energy savings opportunity',
    ],
    references: ['Clean Water Professionals ORP Guide'],
  },
];

export const getDailyStatus = (readings: Reading[], thresholds: Threshold[]): DailyStatus[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Object.values(METRICS).map((metric) => {
    const metricReadings = readings
      .filter((r) => r.metricId === metric.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const todayReading = metricReadings.find((r) => {
      const readingDate = new Date(r.timestamp);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });

    const threshold = thresholds.find((t) => t.metricId === metric.id);
    const recentReadings = metricReadings.slice(0, 7);
    
    let trend: 'rising' | 'stable' | 'falling' | null = null;
    if (recentReadings.length >= 3) {
      const avgFirst = recentReadings.slice(0, 3).reduce((a, b) => a + b.value, 0) / 3;
      const avgLast = recentReadings.slice(-3).reduce((a, b) => a + b.value, 0) / 3;
      const diff = avgFirst - avgLast;
      const sensitivity = (metric.defaultMax - metric.defaultMin) * 0.1;
      
      if (diff > sensitivity) trend = 'rising';
      else if (diff < -sensitivity) trend = 'falling';
      else trend = 'stable';
    }

    let status: DailyStatus['status'] = 'missing';
    if (todayReading && threshold) {
      if (todayReading.value < threshold.min || todayReading.value > threshold.max) {
        const deviation = Math.max(
          threshold.min - todayReading.value,
          todayReading.value - threshold.max
        );
        const range = threshold.max - threshold.min;
        status = deviation > range * 0.5 ? 'critical' : 'warning';
      } else {
        status = 'normal';
      }
    } else if (todayReading) {
      status = 'normal';
    }

    return {
      metricId: metric.id,
      latestValue: todayReading?.value ?? metricReadings[0]?.value ?? null,
      status,
      lastUpdated: todayReading?.timestamp ?? metricReadings[0]?.timestamp ?? null,
      trend,
    };
  });
};
