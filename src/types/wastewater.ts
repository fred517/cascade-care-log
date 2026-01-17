// Severity levels for parameter status
export type Severity = "ok" | "watch" | "alarm";

// All available parameter keys
export type ParameterKey =
  | "ph"
  | "do"
  | "orp"
  | "mlss"
  | "tss"
  | "vss"
  | "turbidity"
  | "svi"
  | "ammonia_tan"
  | "nitrate_no3n"
  | "nitrite_no2n"
  | "alkalinity"
  | "conductivity"
  | "temp_c"
  | "settleable_solids"
  | "sludge_blanket_depth";

// Parameter category for grouping
export type ParameterCategory =
  | "Core"
  | "Solids"
  | "Nutrients"
  | "Process"
  | "Softwater"
  | "Safety";

// Threshold range definition
export interface ThresholdRange {
  min?: number;
  max?: number;
}

// Parameter definition with watch/alarm thresholds
export interface Parameter {
  key: ParameterKey;
  label: string;
  unit: string;
  decimals: number;
  category: ParameterCategory;
  methodHint?: string;
  samplePointHint?: string;
  watch?: ThresholdRange;
  alarm?: ThresholdRange;
  target?: ThresholdRange;
  actions?: {
    watch: string[];
    alarm: string[];
  };
}

// Legacy type alias for backward compatibility
export type MetricType = ParameterKey;

// Legacy Metric interface for backward compatibility
export interface Metric {
  id: ParameterKey;
  name: string;
  unit: string;
  description: string;
  defaultMin: number;
  defaultMax: number;
  precision: number;
  color: string;
}

// Reading record
export interface Reading {
  id: string;
  metricId: ParameterKey;
  value: number;
  timestamp: Date;
  enteredBy: string;
  notes?: string;
  siteId: string;
  attachmentUrl?: string;
}

// Threshold configuration for a site
export interface Threshold {
  metricId: ParameterKey;
  min: number;
  max: number;
  enabled: boolean;
  siteId: string;
}

// Alert status types
export type AlertSeverity = 'watch' | 'alarm' | 'low' | 'medium' | 'high' | 'critical' | 'warning';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

// Alert event record
export interface AlertEvent {
  id: string;
  metricId: ParameterKey;
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

// Action playbook for handling issues
export interface ActionPlaybook {
  id: string;
  metricId: ParameterKey;
  condition: 'low' | 'high';
  title: string;
  steps: string[];
  references: string[];
}

// Site information
export interface Site {
  id: string;
  name: string;
  timezone: string;
  orgId: string;
}

// Daily status summary
export interface DailyStatus {
  metricId: ParameterKey;
  latestValue: number | null;
  status: 'normal' | 'warning' | 'critical' | 'missing';
  lastUpdated: Date | null;
  trend: 'rising' | 'stable' | 'falling' | null;
}

// Complete parameter definitions
export const PARAMETERS: Record<ParameterKey, Parameter> = {
  ph: {
    key: "ph",
    label: "pH",
    unit: "",
    decimals: 2,
    category: "Core",
    target: { min: 6.8, max: 7.5 },
    watch: { min: 6.5, max: 8.5 },
    alarm: { min: 6.0, max: 9.0 },
    methodHint: "Calibrated pH probe or grab sample meter",
    actions: {
      watch: [
        "Check probe calibration (7 & 4 buffers).",
        "Confirm with grab sample if online probe.",
        "Review alkalinity and influent changes."
      ],
      alarm: [
        "Confirm reading immediately (second meter / grab sample).",
        "If low pH: check nitrification demand, acidic trade waste, CO2 stripping.",
        "If high pH: check caustic dosing, industrial discharge, lime carryover."
      ]
    }
  },
  do: {
    key: "do",
    label: "Dissolved Oxygen",
    unit: "mg/L",
    decimals: 2,
    category: "Core",
    target: { min: 1.5, max: 3.0 },
    watch: { min: 1.0, max: 5.0 },
    alarm: { min: 0.5, max: 8.0 },
    methodHint: "Calibrated optical probe preferred",
    actions: {
      watch: [
        "Check aerator/blower runtime and airflow.",
        "Inspect diffuser/aerator condition (fouling).",
        "Review MLSS and loading trend."
      ],
      alarm: [
        "If DO low: increase aeration immediately; check power trips and air leaks.",
        "If DO high: reduce aeration to save energy; confirm mixing is adequate."
      ]
    }
  },
  orp: {
    key: "orp",
    label: "ORP",
    unit: "mV",
    decimals: 0,
    category: "Core",
    target: { min: -50, max: 150 },
    watch: { min: -150, max: 250 },
    alarm: { min: -250, max: 350 },
    methodHint: "Clean ORP probe tip regularly, avoid biofilm",
    actions: {
      watch: [
        "Check DO, nitrate, and aeration pattern.",
        "Inspect for septic influent or H2S odors."
      ],
      alarm: [
        "Strongly negative ORP: investigate septic conditions, increase aeration/mixing.",
        "Strongly positive ORP: confirm sensor, check chemical dosing/oxidants."
      ]
    }
  },
  mlss: {
    key: "mlss",
    label: "MLSS",
    unit: "mg/L",
    decimals: 0,
    category: "Core",
    target: { min: 2500, max: 4500 },
    watch: { min: 1500, max: 6000 },
    alarm: { min: 800, max: 8000 },
    methodHint: "Lab gravimetric or calibrated MLSS probe",
    actions: {
      watch: [
        "Review wasting rate and clarifier performance.",
        "Check SVI and blanket depth."
      ],
      alarm: [
        "If MLSS low: reduce wasting, check washout/clarifier solids loss.",
        "If MLSS high: increase wasting; verify oxygen transfer capacity."
      ]
    }
  },
  tss: {
    key: "tss",
    label: "TSS",
    unit: "mg/L",
    decimals: 0,
    category: "Solids",
    watch: { max: 30 },
    alarm: { max: 60 },
    methodHint: "Lab gravimetric (effluent), site-specific consent applies",
    actions: {
      watch: [
        "Check clarifier blanket depth and RAS rate.",
        "Inspect for hydraulic surges and short-circuiting."
      ],
      alarm: [
        "Confirm sample and lab method.",
        "Increase solids capture: adjust RAS/WAS, check floc, consider polymer (if applicable).",
        "Inspect for mechanical failure (scrapers, weirs, scum baffles)."
      ]
    }
  },
  vss: {
    key: "vss",
    label: "VSS",
    unit: "mg/L",
    decimals: 0,
    category: "Solids",
    methodHint: "Lab (calc from ignition loss)",
    actions: {
      watch: [
        "Track VSS/MLSS ratio for biology vs inert buildup."
      ],
      alarm: [
        "Low VSS fraction: investigate inert solids ingress (grit, trade waste).",
        "High VSS with poor settling: investigate filaments/FOG issues."
      ]
    }
  },
  turbidity: {
    key: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    decimals: 1,
    category: "Solids",
    watch: { max: 10 },
    alarm: { max: 25 },
    methodHint: "Portable turbidimeter, rinse vial carefully",
    actions: {
      watch: [
        "Use as early warning for solids breakthrough.",
        "Cross-check with TSS trend weekly."
      ],
      alarm: [
        "Inspect clarifier effluent and weirs immediately.",
        "Check for rising sludge, scum carryover, or hydraulic shock."
      ]
    }
  },
  svi: {
    key: "svi",
    label: "SVI",
    unit: "mL/g",
    decimals: 0,
    category: "Process",
    target: { min: 80, max: 140 },
    watch: { min: 60, max: 180 },
    alarm: { min: 40, max: 250 },
    methodHint: "30-min settle test + MLSS",
    actions: {
      watch: [
        "Trend with DO, F/M, and nutrient balance.",
        "Check for early bulking signs and foam."
      ],
      alarm: [
        "High SVI: investigate filaments, low DO zones, nutrient deficiency, FOG/grease.",
        "Low SVI: possible pin floc or old sludge; review SRT and wasting."
      ]
    }
  },
  ammonia_tan: {
    key: "ammonia_tan",
    label: "Ammonia (TAN as N)",
    unit: "mg/L",
    decimals: 1,
    category: "Nutrients",
    watch: { max: 2.0 },
    alarm: { max: 5.0 },
    methodHint: "Lab or calibrated ISE (watch for interferences)",
    actions: {
      watch: [
        "Check alkalinity and pH (nitrification demand).",
        "Confirm aeration and temperature trend."
      ],
      alarm: [
        "Confirm with lab if probe-based.",
        "Increase aeration, verify alkalinity, review toxic shock risk.",
        "If cold weather: adjust expectations and SRT."
      ]
    }
  },
  nitrate_no3n: {
    key: "nitrate_no3n",
    label: "Nitrate (NO₃-N)",
    unit: "mg/L",
    decimals: 1,
    category: "Nutrients",
    watch: { max: 10 },
    alarm: { max: 20 },
    methodHint: "Lab or probe depending on site",
    actions: {
      watch: [
        "If rising: nitrification strong but denit may be limited.",
        "Check carbon availability and anoxic volume/time."
      ],
      alarm: [
        "Review internal recycle rates and anoxic control.",
        "Consider carbon addition strategy (if designed)."
      ]
    }
  },
  nitrite_no2n: {
    key: "nitrite_no2n",
    label: "Nitrite (NO₂-N)",
    unit: "mg/L",
    decimals: 2,
    category: "Nutrients",
    watch: { max: 0.5 },
    alarm: { max: 1.0 },
    actions: {
      watch: [
        "Often indicates nitrification stress (pH, temp, toxins, low DO)."
      ],
      alarm: [
        "Confirm immediately. Check DO, pH, alkalinity, toxicity, and aeration distribution."
      ]
    }
  },
  alkalinity: {
    key: "alkalinity",
    label: "Alkalinity (as CaCO₃)",
    unit: "mg/L",
    decimals: 0,
    category: "Nutrients",
    watch: { min: 60 },
    alarm: { min: 40 },
    actions: {
      watch: [
        "If nitrifying, keep buffer adequate to avoid pH crash."
      ],
      alarm: [
        "Risk of nitrification stall and pH drop. Review alkalinity dosing or influent changes."
      ]
    }
  },
  conductivity: {
    key: "conductivity",
    label: "Conductivity",
    unit: "µS/cm",
    decimals: 0,
    category: "Softwater",
    watch: { max: 5000 },
    alarm: { max: 8000 },
    actions: {
      watch: [
        "Use as a proxy for trade waste or salinity shift.",
        "Trend against ammonia/nitrite upsets."
      ],
      alarm: [
        "Investigate industrial discharge, brine, CIP dumps.",
        "Consider toxicity impact on nitrifiers."
      ]
    }
  },
  temp_c: {
    key: "temp_c",
    label: "Temperature",
    unit: "°C",
    decimals: 1,
    category: "Core",
    watch: { min: 10, max: 35 },
    alarm: { min: 5, max: 40 },
    actions: {
      watch: [
        "Expect nitrification sensitivity as temp drops."
      ],
      alarm: [
        "Confirm sensor. Review process capacity expectations and aeration strategy."
      ]
    }
  },
  settleable_solids: {
    key: "settleable_solids",
    label: "Settleable Solids (Imhoff)",
    unit: "mL/L",
    decimals: 1,
    category: "Solids",
    watch: { max: 10 },
    alarm: { max: 20 },
    actions: {
      watch: [
        "Check clarifier and sludge return performance."
      ],
      alarm: [
        "High settleables: solids carryover risk. Inspect for shock load and clarifier issues."
      ]
    }
  },
  sludge_blanket_depth: {
    key: "sludge_blanket_depth",
    label: "Sludge Blanket Depth",
    unit: "m",
    decimals: 2,
    category: "Process",
    watch: { max: 1.0 },
    alarm: { max: 1.5 },
    actions: {
      watch: [
        "Increase RAS or wasting depending on MLSS/SVI.",
        "Inspect for rising sludge if denit in clarifier."
      ],
      alarm: [
        "Immediate solids loss risk. Adjust RAS/WAS and inspect scraper/weirs."
      ]
    }
  }
};

// Export as array for iteration
export const PARAMETER_LIST: Parameter[] = Object.values(PARAMETERS);

// Helper to get default thresholds from parameter definition
export function getDefaultThresholds(param: Parameter): { min: number; max: number } {
  // Use watch thresholds as defaults, falling back to alarm if no watch
  const watchMin = param.watch?.min ?? param.alarm?.min ?? 0;
  const watchMax = param.watch?.max ?? param.alarm?.max ?? 100;
  return { min: watchMin, max: watchMax };
}

// Helper to determine severity based on value and parameter
export function getSeverity(value: number, param: Parameter): Severity {
  const { alarm, watch } = param;
  
  // Check alarm thresholds first
  if (alarm) {
    if (alarm.min !== undefined && value < alarm.min) return "alarm";
    if (alarm.max !== undefined && value > alarm.max) return "alarm";
  }
  
  // Check watch thresholds
  if (watch) {
    if (watch.min !== undefined && value < watch.min) return "watch";
    if (watch.max !== undefined && value > watch.max) return "watch";
  }
  
  return "ok";
}

// Helper to check if value is in target range
export function isInTargetRange(value: number, param: Parameter): boolean {
  if (!param.target) return true;
  const { min, max } = param.target;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

// Legacy METRICS object for backward compatibility
export const METRICS: Record<ParameterKey, Metric> = Object.fromEntries(
  Object.entries(PARAMETERS).map(([key, param]) => {
    const defaults = getDefaultThresholds(param);
    return [
      key,
      {
        id: param.key,
        name: param.label,
        unit: param.unit,
        description: getParameterDescription(param.key),
        defaultMin: defaults.min,
        defaultMax: defaults.max,
        precision: param.decimals,
        color: `metric-${param.key}`,
      },
    ];
  })
) as Record<ParameterKey, Metric>;

// Get a brief description for each parameter
function getParameterDescription(key: ParameterKey): string {
  const descriptions: Record<ParameterKey, string> = {
    ph: "Acidity/Alkalinity level",
    do: "Dissolved Oxygen level",
    orp: "Oxidation-Reduction Potential",
    mlss: "Mixed Liquor Suspended Solids",
    tss: "Total Suspended Solids",
    vss: "Volatile Suspended Solids",
    turbidity: "Water clarity measurement",
    svi: "Sludge Volume Index - settling characteristics",
    ammonia_tan: "Ammonia nitrogen concentration",
    nitrate_no3n: "Nitrate nitrogen concentration",
    nitrite_no2n: "Nitrite nitrogen concentration",
    alkalinity: "Buffering capacity",
    conductivity: "Electrical conductivity",
    temp_c: "Process temperature",
    settleable_solids: "Settleable solids in wastewater",
    sludge_blanket_depth: "Clarifier sludge blanket level",
  };
  return descriptions[key];
}

// Parameter icons for UI
export const PARAMETER_ICONS: Record<ParameterKey, string> = {
  ph: '⚗️',
  do: '💨',
  orp: '⚡',
  mlss: '🔬',
  tss: '🧱',
  vss: '🔥',
  turbidity: '💧',
  svi: '🧪',
  ammonia_tan: '🧫',
  nitrate_no3n: '🌿',
  nitrite_no2n: '⚠️',
  alkalinity: '🧂',
  conductivity: '📡',
  temp_c: '🌡️',
  settleable_solids: '📊',
  sludge_blanket_depth: '📏',
};

// Default parameter order for forms
export const DEFAULT_PARAMETER_ORDER: ParameterKey[] = [
  // Core
  'ph', 'do', 'orp', 'mlss', 'temp_c',
  // Process
  'svi', 'sludge_blanket_depth',
  // Solids
  'tss', 'vss', 'turbidity', 'settleable_solids',
  // Nutrients
  'ammonia_tan', 'nitrate_no3n', 'nitrite_no2n', 'alkalinity',
  // Softwater
  'conductivity',
];

// Get parameters by category
export function getParametersByCategory(): Record<ParameterCategory, Parameter[]> {
  const categories: Record<ParameterCategory, Parameter[]> = {
    Core: [],
    Solids: [],
    Nutrients: [],
    Process: [],
    Softwater: [],
    Safety: [],
  };
  
  PARAMETER_LIST.forEach(param => {
    categories[param.category].push(param);
  });
  
  return categories;
}
