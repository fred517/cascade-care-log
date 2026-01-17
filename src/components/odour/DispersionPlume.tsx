import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DispersionPlumeProps {
  /** Source position as percentage (0-100) */
  sourceX: number;
  sourceY: number;
  /** Wind direction in degrees (meteorological, where wind is coming FROM) */
  windDirection: number;
  /** Wind speed in m/s */
  windSpeed: number;
  /** Pasquill-Gifford stability class (A-F) */
  stabilityClass: string;
  /** Optional intensity (1-5) affects color */
  intensity?: number;
  /** Container width for scaling */
  containerWidth?: number;
}

/**
 * Dispersion coefficients (σy, σz) based on Pasquill-Gifford stability classes
 * These define how the plume spreads laterally and vertically
 */
const STABILITY_PARAMS: Record<string, { spreadRate: number; color: string; label: string }> = {
  A: { spreadRate: 0.22, color: 'rgba(239, 68, 68, 0.3)', label: 'Very Unstable' },
  B: { spreadRate: 0.16, color: 'rgba(249, 115, 22, 0.3)', label: 'Unstable' },
  C: { spreadRate: 0.11, color: 'rgba(234, 179, 8, 0.3)', label: 'Slightly Unstable' },
  D: { spreadRate: 0.08, color: 'rgba(156, 163, 175, 0.3)', label: 'Neutral' },
  E: { spreadRate: 0.06, color: 'rgba(59, 130, 246, 0.3)', label: 'Slightly Stable' },
  F: { spreadRate: 0.04, color: 'rgba(99, 102, 241, 0.3)', label: 'Stable' },
};

/**
 * Creates SVG path for a Gaussian plume shape
 * The plume expands downwind based on stability class
 */
function createPlumePath(
  spreadRate: number,
  plumeLength: number,
  scale: number = 1
): string {
  const points: string[] = [];
  const steps = 20;
  
  // Calculate plume width at various downwind distances
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * plumeLength;
    // Gaussian plume width increases with distance
    // σy ≈ spreadRate * x (simplified)
    const width = spreadRate * x * 2.5 * scale;
    
    if (i === 0) {
      points.push(`M 0 0`);
    }
    points.push(`L ${x} ${-width}`);
  }
  
  // Return path along bottom edge
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * plumeLength;
    const width = spreadRate * x * 2.5 * scale;
    points.push(`L ${x} ${width}`);
  }
  
  points.push('Z');
  return points.join(' ');
}

export default function DispersionPlume({
  sourceX,
  sourceY,
  windDirection,
  windSpeed,
  stabilityClass,
  intensity = 3,
  containerWidth = 800,
}: DispersionPlumeProps) {
  const params = STABILITY_PARAMS[stabilityClass] || STABILITY_PARAMS.D;
  
  // Calculate plume characteristics
  const plumeData = useMemo(() => {
    // Plume travels in direction wind is blowing TO (opposite of meteorological direction)
    const plumeDirectionDeg = (windDirection + 180) % 360;
    const plumeDirectionRad = (plumeDirectionDeg - 90) * (Math.PI / 180);
    
    // Plume length based on wind speed (longer = faster travel)
    // Scale relative to container (as percentage)
    const baseLengthPercent = Math.min(60, 15 + windSpeed * 5);
    const plumeLength = (baseLengthPercent / 100) * containerWidth;
    
    // Generate plume path
    const path = createPlumePath(params.spreadRate, plumeLength, 1);
    
    // Calculate opacity based on intensity
    const baseOpacity = 0.15 + (intensity / 5) * 0.35;
    
    // Get color based on stability and intensity
    let fillColor = params.color;
    if (intensity >= 4) {
      fillColor = fillColor.replace('0.3', `${baseOpacity}`);
    }
    
    return {
      plumeDirectionDeg,
      plumeDirectionRad,
      plumeLength,
      path,
      fillColor,
      baseOpacity,
    };
  }, [windDirection, windSpeed, params.spreadRate, containerWidth, intensity]);

  if (windSpeed < 0.5) {
    // Calm conditions - show circular dispersion
    return (
      <div
        className="absolute pointer-events-none z-5"
        style={{
          left: `${sourceX}%`,
          top: `${sourceY}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="rounded-full animate-pulse"
          style={{
            width: `${40 + intensity * 10}px`,
            height: `${40 + intensity * 10}px`,
            background: `radial-gradient(circle, ${params.color} 0%, transparent 70%)`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute pointer-events-none z-5"
      style={{
        left: `${sourceX}%`,
        top: `${sourceY}%`,
        transform: `translate(-2px, -2px) rotate(${plumeData.plumeDirectionDeg}deg)`,
        transformOrigin: '0 0',
      }}
    >
      <svg
        width={plumeData.plumeLength + 20}
        height={plumeData.plumeLength * params.spreadRate * 6 + 20}
        style={{
          overflow: 'visible',
          transform: 'translateY(-50%)',
        }}
      >
        {/* Gradient definition for smoother plume */}
        <defs>
          <linearGradient id={`plume-gradient-${sourceX}-${sourceY}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={params.color.replace('0.3', '0.6')} />
            <stop offset="50%" stopColor={params.color.replace('0.3', '0.4')} />
            <stop offset="100%" stopColor={params.color.replace('0.3', '0.1')} />
          </linearGradient>
        </defs>
        
        {/* Main plume shape */}
        <path
          d={plumeData.path}
          fill={`url(#plume-gradient-${sourceX}-${sourceY})`}
          className="transition-all duration-500"
        />
        
        {/* Source point indicator */}
        <circle
          cx="0"
          cy="0"
          r="4"
          fill="hsl(var(--primary))"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

export function PlumeInfoPanel({
  windSpeed,
  windDirection,
  stabilityClass,
  temperature,
}: {
  windSpeed: number;
  windDirection: number;
  stabilityClass: string;
  temperature?: number | null;
}) {
  const params = STABILITY_PARAMS[stabilityClass] || STABILITY_PARAMS.D;
  
  // Get wind direction text
  const getWindDirectionText = (deg: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-lg border border-border p-3 text-xs z-20 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: params.color.replace('0.3', '0.8') }}
        />
        <span className="font-medium">Dispersion Model</span>
      </div>
      
      <div className="space-y-1 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span>Wind:</span>
          <span className="text-foreground font-medium">
            {windSpeed.toFixed(1)} m/s from {getWindDirectionText(windDirection)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Stability:</span>
          <span className="text-foreground font-medium">
            {stabilityClass} - {params.label}
          </span>
        </div>
        {temperature !== null && temperature !== undefined && (
          <div className="flex justify-between gap-4">
            <span>Temp:</span>
            <span className="text-foreground font-medium">{temperature.toFixed(1)}°C</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t border-border">
        <div className="text-[10px] text-muted-foreground">
          {stabilityClass <= 'C' 
            ? '↑ Good dispersion conditions' 
            : stabilityClass >= 'E'
            ? '↓ Poor dispersion - odour may linger'
            : '→ Moderate dispersion conditions'
          }
        </div>
      </div>
    </div>
  );
}

export function PlumeLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs mt-2">
      <span className="text-muted-foreground font-medium">Stability:</span>
      {Object.entries(STABILITY_PARAMS).map(([key, { color, label }]) => (
        <div key={key} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: color.replace('0.3', '0.7') }}
          />
          <span>{key}</span>
        </div>
      ))}
    </div>
  );
}
