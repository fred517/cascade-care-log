// Re-export parameter types and constants from wastewater types
// This provides a cleaner import path for components

export type { 
  ParameterKey, 
  Parameter,
  ParameterCategory,
  ThresholdRange,
  Severity
} from '@/types/wastewater';

export { 
  PARAMETERS, 
  PARAMETER_LIST,
  PARAMETER_ICONS,
  DEFAULT_PARAMETER_ORDER,
  getDefaultThresholds,
  getSeverity,
  isInTargetRange,
  getParametersByCategory
} from '@/types/wastewater';
