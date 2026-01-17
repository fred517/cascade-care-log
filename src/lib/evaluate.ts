// Re-export evaluation functions and types from evaluation.ts
// This provides a cleaner import path for components

export { 
  evaluateReadings, 
  getSeverityColor, 
  getSeverityBgColor,
  type Reading,
  type Evaluation
} from '@/lib/evaluation';
