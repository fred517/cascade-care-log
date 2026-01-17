import { useState, useRef, useEffect } from 'react';
import { MapPin, AlertTriangle, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteMap, OdourIncident } from '@/types/odour';
import DispersionPlume, { PlumeInfoPanel, PlumeLegend } from './DispersionPlume';
import { useLatestWeatherSnapshot } from '@/hooks/useWeatherSnapshots';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface InteractiveSiteMapProps {
  siteMap: SiteMap;
  incidents: OdourIncident[];
  onMapClick: (position: { x: number; y: number }) => void;
  onIncidentClick?: (incident: OdourIncident) => void;
}

export default function InteractiveSiteMap({ siteMap, incidents, onMapClick, onIncidentClick }: InteractiveSiteMapProps) {
  const [hoveredIncident, setHoveredIncident] = useState<string | null>(null);
  const [showPlumes, setShowPlumes] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const imageRef = useRef<HTMLDivElement>(null);
  
  const { data: weatherSnapshot, isLoading: weatherLoading } = useLatestWeatherSnapshot();

  // Track container size for plume scaling
  useEffect(() => {
    if (!imageRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onMapClick({ x, y });
  };

  const getIncidentColor = (incident: OdourIncident) => {
    if (incident.status === 'resolved' || incident.status === 'closed') {
      return 'bg-green-500';
    }
    if (incident.intensity && incident.intensity >= 4) {
      return 'bg-red-500';
    }
    if (incident.intensity && incident.intensity >= 3) {
      return 'bg-yellow-500';
    }
    return 'bg-orange-500';
  };

  // Filter to show only open/investigating incidents - resolved/closed are hidden from map
  const visibleIncidents = incidents.filter(incident => {
    if (incident.site_map_id !== siteMap.id) return false;
    // Only show open or investigating incidents on the map
    return incident.status === 'open' || incident.status === 'investigating';
  });

  // Check if we have valid weather data for plumes
  const hasWeatherData = weatherSnapshot && 
    weatherSnapshot.wind_speed_mps !== null && 
    weatherSnapshot.wind_direction_deg !== null &&
    weatherSnapshot.stability_class;

  return (
    <div className="relative">
      {/* Plume toggle control */}
      {hasWeatherData && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="show-plumes"
              checked={showPlumes}
              onCheckedChange={setShowPlumes}
            />
            <Label htmlFor="show-plumes" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Wind className="w-4 h-4" />
              Show Dispersion Plumes
            </Label>
          </div>
          {weatherLoading && (
            <span className="text-xs text-muted-foreground">Loading weather...</span>
          )}
        </div>
      )}

      <div
        ref={imageRef}
        className="relative cursor-crosshair rounded-xl overflow-hidden border border-border"
        onClick={handleClick}
      >
        <img
          src={siteMap.image_url}
          alt={siteMap.name}
          className="w-full h-auto"
          draggable={false}
        />
        
        {/* Dispersion plumes for active incidents */}
        {showPlumes && hasWeatherData && visibleIncidents.map((incident) => (
          <DispersionPlume
            key={`plume-${incident.id}`}
            sourceX={incident.click_x}
            sourceY={incident.click_y}
            windDirection={weatherSnapshot.wind_direction_deg!}
            windSpeed={weatherSnapshot.wind_speed_mps!}
            stabilityClass={weatherSnapshot.stability_class!}
            intensity={incident.intensity || 3}
            containerWidth={containerWidth}
          />
        ))}
        
        {/* Incident markers */}
        {visibleIncidents.map((incident) => (
          <div
            key={incident.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
            style={{
              left: `${incident.click_x}%`,
              top: `${incident.click_y}%`,
            }}
            onMouseEnter={() => setHoveredIncident(incident.id)}
            onMouseLeave={() => setHoveredIncident(null)}
            onClick={(e) => {
              e.stopPropagation();
              onIncidentClick?.(incident);
            }}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform',
                getIncidentColor(incident),
                hoveredIncident === incident.id && 'scale-125'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
            
            {/* Tooltip on hover */}
            {hoveredIncident === incident.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-popover text-popover-foreground rounded-lg p-2 shadow-lg text-xs z-20">
                <p className="font-semibold">{incident.odour_type?.replace('_', ' ')}</p>
                <p className="text-muted-foreground">
                  {new Date(incident.incident_at).toLocaleDateString()}
                </p>
                {incident.intensity && (
                  <p>Intensity: {incident.intensity}/5</p>
                )}
                <p className="capitalize">Status: {incident.status}</p>
              </div>
            )}
          </div>
        ))}
        
        {/* Weather info panel */}
        {showPlumes && hasWeatherData && (
          <PlumeInfoPanel
            windSpeed={weatherSnapshot.wind_speed_mps!}
            windDirection={weatherSnapshot.wind_direction_deg!}
            stabilityClass={weatherSnapshot.stability_class!}
            temperature={weatherSnapshot.temperature_c}
          />
        )}
        
        {/* Click instruction overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-black/10">
          <div className="bg-background/90 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Click to report odour</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>High intensity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Resolved</span>
        </div>
      </div>
      
      {/* Plume legend when enabled */}
      {showPlumes && hasWeatherData && <PlumeLegend />}
    </div>
  );
}
