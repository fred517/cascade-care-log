import { ParameterKey, PARAMETERS } from '@/types/wastewater';

export interface DefaultPlaybook {
  metricId: ParameterKey;
  condition: 'low' | 'high';
  title: string;
  steps: string[];
  referenceLinks: string[];
}

// Generate default playbooks from PARAMETERS actions
export function generateDefaultPlaybooks(): DefaultPlaybook[] {
  const playbooks: DefaultPlaybook[] = [];
  
  for (const [key, param] of Object.entries(PARAMETERS)) {
    const metricId = key as ParameterKey;
    
    // Generate LOW condition playbook if there are low-related actions
    const hasLowThreshold = param.watch?.min !== undefined || param.alarm?.min !== undefined;
    if (hasLowThreshold) {
      playbooks.push({
        metricId,
        condition: 'low',
        title: `${param.label} Low Response`,
        steps: getLowSteps(metricId, param),
        referenceLinks: getReferenceLinks(metricId),
      });
    }
    
    // Generate HIGH condition playbook if there are high-related actions
    const hasHighThreshold = param.watch?.max !== undefined || param.alarm?.max !== undefined;
    if (hasHighThreshold) {
      playbooks.push({
        metricId,
        condition: 'high',
        title: `${param.label} High Response`,
        steps: getHighSteps(metricId, param),
        referenceLinks: getReferenceLinks(metricId),
      });
    }
  }
  
  return playbooks;
}

function getLowSteps(metricId: ParameterKey, param: typeof PARAMETERS[ParameterKey]): string[] {
  // Use existing actions from PARAMETERS as base
  const watchActions = param.actions?.watch || [];
  const alarmActions = param.actions?.alarm || [];
  
  // Combine and filter for low-specific actions
  const allActions = [...new Set([...watchActions, ...alarmActions])];
  
  // Add specific low-condition steps based on parameter
  const lowSteps: Record<ParameterKey, string[]> = {
    ph: [
      "Check nitrification demand and influent pH",
      "Review caustic/alkalinity dosing rates",
      "Test for acidic industrial discharge",
      "Check CO2 stripping in aeration",
      "Document pH trend and notify supervisor"
    ],
    do: [
      "Increase blower output or add standby aerator",
      "Check for power trips or air system faults",
      "Inspect diffuser condition for fouling",
      "Review MLSS levels - high solids reduce DO",
      "Monitor for signs of biological stress"
    ],
    orp: [
      "Check for septic influent conditions",
      "Review aeration pattern and mixing",
      "Test for H2S/sulfide presence",
      "Increase recirculation if available",
      "Document conditions and notify supervisor"
    ],
    mlss: [
      "Reduce or stop wasting immediately",
      "Check clarifier for solids washout",
      "Inspect RAS pumping rates",
      "Review influent loading trends",
      "Consider seeding if major loss occurred"
    ],
    tss: allActions,
    vss: [
      "Calculate VSS/TSS ratio",
      "Check for high inert solids ingress",
      "Review primary clarifier performance",
      "Inspect for grit system bypass"
    ],
    turbidity: allActions,
    svi: [
      "Review sludge age and wasting rate",
      "Check for pin floc formation",
      "Verify MLSS measurement accuracy",
      "Reduce wasting to increase SRT"
    ],
    ammonia_tan: allActions,
    nitrate_no3n: [
      "Check nitrification performance",
      "Review aeration and DO levels",
      "Test alkalinity availability",
      "Verify temperature is adequate"
    ],
    nitrite_no2n: allActions,
    alkalinity: [
      "Check alkalinity dosing system",
      "Calculate nitrification demand",
      "Review caustic/lime inventory",
      "Risk of pH crash - monitor closely"
    ],
    conductivity: allActions,
    temp_c: [
      "Check for equipment heating options",
      "Expect reduced nitrification rates",
      "Adjust SRT targets for cold conditions",
      "Monitor ammonia breakthrough"
    ],
    settleable_solids: allActions,
    sludge_blanket_depth: allActions
  };
  
  return lowSteps[metricId] || allActions;
}

function getHighSteps(metricId: ParameterKey, param: typeof PARAMETERS[ParameterKey]): string[] {
  const watchActions = param.actions?.watch || [];
  const alarmActions = param.actions?.alarm || [];
  const allActions = [...new Set([...watchActions, ...alarmActions])];
  
  const highSteps: Record<ParameterKey, string[]> = {
    ph: [
      "Check caustic/lime dosing rates - reduce if excessive",
      "Test for industrial alkaline discharge",
      "Review any chemical cleaning activities",
      "Verify probe calibration accuracy",
      "Document and notify supervisor"
    ],
    do: [
      "Reduce aeration to save energy costs",
      "Verify adequate mixing is maintained",
      "Check for false high readings (bubble interference)",
      "Excess DO wastes energy - optimize"
    ],
    orp: [
      "Check for chemical oxidant residuals",
      "Verify sensor calibration",
      "Review any disinfection activities",
      "Document unusual conditions"
    ],
    mlss: [
      "Increase wasting rate immediately",
      "Check oxygen transfer capacity",
      "Verify clarifier can handle solids loading",
      "Risk of clarifier overload - monitor blanket"
    ],
    tss: [
      "Check clarifier blanket depth",
      "Adjust RAS rates to remove solids",
      "Inspect weirs and scum baffles",
      "Look for rising sludge or short-circuiting",
      "Consider polymer addition if permitted"
    ],
    vss: [
      "Check for FOG/grease ingress",
      "Review filament analysis results",
      "Check for organic shock loading",
      "Verify F/M ratio calculations"
    ],
    turbidity: [
      "Immediate solids breakthrough risk",
      "Inspect clarifier weirs and baffles",
      "Check for rising sludge",
      "Verify no hydraulic surges",
      "Cross-check with TSS"
    ],
    svi: [
      "Investigate filamentous bulking",
      "Check DO distribution - low DO zones?",
      "Review nutrient balance (N:P)",
      "Check for FOG/grease issues",
      "Consider selector zone operation"
    ],
    ammonia_tan: [
      "Increase aeration capacity",
      "Verify alkalinity is adequate",
      "Check for nitrifier toxicity",
      "Review SRT and MLSS targets",
      "Cold weather: adjust expectations"
    ],
    nitrate_no3n: [
      "Increase anoxic zone contact time",
      "Add supplemental carbon if available",
      "Increase internal recycle rate",
      "Check denitrification zones"
    ],
    nitrite_no2n: [
      "IMMEDIATE: Check for nitrifier stress",
      "Verify DO levels are adequate",
      "Test pH and alkalinity",
      "Check for toxicity event",
      "Increase aeration in affected zones"
    ],
    alkalinity: [
      "Reduce alkalinity dosing",
      "Check for lime/caustic overdosing",
      "Verify dosing pump calibration"
    ],
    conductivity: [
      "Investigate for industrial brine discharge",
      "Check for CIP/cleaning chemical dumps",
      "Test for nitrifier toxicity symptoms",
      "Document source if identified"
    ],
    temp_c: [
      "Check for hot industrial discharge",
      "Verify cooling systems operating",
      "High temps can stress biology",
      "Monitor DO (warm water holds less oxygen)"
    ],
    settleable_solids: [
      "High solids carryover risk",
      "Check clarifier for shock loading",
      "Adjust RAS/WAS rates",
      "Inspect mechanical components"
    ],
    sludge_blanket_depth: [
      "IMMEDIATE solids loss risk",
      "Increase RAS pumping rate",
      "Increase wasting rate",
      "Inspect scraper and mechanism",
      "Check for denitrification (rising sludge)"
    ]
  };
  
  return highSteps[metricId] || allActions;
}

function getReferenceLinks(metricId: ParameterKey): string[] {
  const baseRefs: Record<ParameterKey, string[]> = {
    ph: ["EPA pH Guidelines", "Process Control Manual Ch. 5"],
    do: ["WEF MOP 11 - Aeration", "Energy Optimization Guide"],
    orp: ["WEF ORP Guidelines", "Anaerobic/Anoxic Monitoring"],
    mlss: ["WEF Activated Sludge Manual", "MLSS Management Best Practices"],
    tss: ["EPA Permit Compliance", "Clarifier Operation Guide"],
    vss: ["Sludge Analysis Handbook", "Activated Sludge Diagnostics"],
    turbidity: ["EPA Turbidity Method", "Effluent Quality Monitoring"],
    svi: ["WEF Bulking Control", "Filament Identification Guide"],
    ammonia_tan: ["EPA Nutrient Guidelines", "Nitrification Optimization"],
    nitrate_no3n: ["BNR Process Manual", "Denitrification Guidelines"],
    nitrite_no2n: ["Nitrification Troubleshooting", "Process Upset Response"],
    alkalinity: ["Alkalinity for Nitrification", "Chemical Feed Calculations"],
    conductivity: ["Conductivity Monitoring", "Trade Waste Management"],
    temp_c: ["Temperature Effects Guide", "Seasonal Process Adjustments"],
    settleable_solids: ["Imhoff Cone Testing", "Clarifier Performance"],
    sludge_blanket_depth: ["Blanket Depth Management", "Clarifier Troubleshooting"]
  };
  
  return baseRefs[metricId] || ["General Operations Manual"];
}

// Get the default playbook for a specific metric and condition
export function getDefaultPlaybook(metricId: ParameterKey, condition: 'low' | 'high'): DefaultPlaybook | undefined {
  const playbooks = generateDefaultPlaybooks();
  return playbooks.find(p => p.metricId === metricId && p.condition === condition);
}
