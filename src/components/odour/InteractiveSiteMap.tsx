import { useState, useRef, useEffect } from 'react';
import { MapPin, AlertTriangle, Wind, Factory, PlusCircle, X, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteMap, OdourIncident } from '@/types/odour';
import DispersionPlume, { PlumeInfoPanel, PlumeLegend } from './DispersionPlume';
import { useLatestWeatherSnapshot } from '@/hooks/useWeatherSnapshots';
import { useOdourSources, useCreateOdourSource, type OdourSource } from '@/hooks/useOdourSources';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InteractiveSiteMapProps {
  siteMap: SiteMap;
  incidents: OdourIncident[];
  onMapClick: (position: { x: number; y: number }) => void;
  onIncidentClick?: (incident: OdourIncident) => void;
}

type ClickMode = 'incident' | 'source' | 'none';

export default function InteractiveSiteMap({ siteMap, incidents, onMapClick, onIncidentClick }: InteractiveSiteMapProps) {
  const [hoveredIncident, setHoveredIncident] = useState<string | null>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [showPlumes, setShowPlumes] = useState(true);
  const [clickMode, setClickMode] = useState<ClickMode>('none');
  const [containerWidth, setContainerWidth] = useState(800);
  const imageRef = useRef<HTMLDivElement>(null);
  
  const { data: latestSnapshot, isLoading: latestLoading } = useLatestWeatherSnapshot();
  const { data: odourSources = [] } = useOdourSources();
  const createSource = useCreateOdourSource();
  const geo = useGeolocation();

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

  // Escape key to cancel placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && clickMode !== 'none') {
        setClickMode('none');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clickMode]);

  const handleClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    if (clickMode === 'none') return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (clickMode === 'source') {
      createSource.mutate({
        name: `Source ${odourSources.length + 1}`,
        geometry: { type: 'point', x, y },
        base_intensity: 3,
      });
      setClickMode('none');
    } else if (clickMode === 'incident') {
      onMapClick({ x, y });
      setClickMode('none');
    }
  };

  const getIncidentColor = (incident: OdourIncident) => {
    if (incident.intensity && incident.intensity >= 4) {
      return 'bg-red-500';
    }
    if (incident.intensity && incident.intensity >= 3) {
      return 'bg-yellow-500';
    }
    return 'bg-orange-500';
  };

  // Convert lat/lng to approximate x/y percentages for display
  // This is a simplified approach - in production you'd use proper geo transformation
  const getIncidentPosition = (incident: OdourIncident) => {
    // For now, use a simple hash-based position since we don't have proper geo bounds
    const hash = incident.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      x: 10 + (hash % 80),
      y: 10 + ((hash * 7) % 80),
    };
  };

  const hasWeatherData = latestSnapshot && 
    latestSnapshot.wind_speed_mps !== null && 
    latestSnapshot.wind_direction_deg !== null &&
    latestSnapshot.stability_class;

  // Convert GPS coords to map position (simplified - uses hash for demo)
  // In production, you'd use proper geo bounds from the siteMap
  const getGpsPosition = (): { x: number; y: number } | null => {
    if (geo.status !== 'granted') return null;
    // Simplified positioning - in production use actual geo bounds
    const lat = geo.coords.lat;
    const lng = geo.coords.lng;
    // Use modulo to place within map bounds (demo approach)
    const x = 20 + ((Math.abs(lng) * 1000) % 60);
    const y = 20 + ((Math.abs(lat) * 1000) % 60);
    return { x, y };
  };

  const gpsPosition = getGpsPosition();

  // Get source position for rendering
  const getSourcePosition = (source: OdourSource): { x: number; y: number } | null => {
    if (source.geometry.type === 'point' && source.geometry.x !== undefined && source.geometry.y !== undefined) {
      return { x: source.geometry.x, y: source.geometry.y };
    }
    if (source.geometry.type === 'polygon' && source.geometry.coordinates?.length) {
      const coords = source.geometry.coordinates;
      const x = coords.reduce((sum, c) => sum + c.x, 0) / coords.length;
      const y = coords.reduce((sum, c) => sum + c.y, 0) / coords.length;
      return { x, y };
    }
    return null;
  };

  return (
    <div className="relative space-y-3">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              id="show-plumes"
              checked={showPlumes}
              onCheckedChange={setShowPlumes}
            />
            <Label htmlFor="show-plumes" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Wind className="w-4 h-4" />
              Dispersion Plumes
            </Label>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {clickMode !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClickMode('none')}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={clickMode === 'incident' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setClickMode(clickMode === 'incident' ? 'none' : 'incident')}
                className={clickMode === 'incident' ? 'animate-pulse' : ''}
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                {clickMode === 'incident' ? 'Click map to place' : 'Record Incident'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to enter incident recording mode, then click on the map</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={clickMode === 'source' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setClickMode(clickMode === 'source' ? 'none' : 'source')}
                className={clickMode === 'source' ? 'animate-pulse' : ''}
              >
                <Factory className="w-4 h-4 mr-1" />
                {clickMode === 'source' ? 'Click map to place' : 'Add Source'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Define odour emission sources for plume modeling</p>
            </TooltipContent>
          </Tooltip>
          
          {latestLoading && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
        </div>
      </div>

      <div
        ref={imageRef}
        className={cn(
          "relative rounded-xl overflow-hidden border-2 transition-all duration-200",
          clickMode !== 'none' 
            ? 'cursor-crosshair border-primary shadow-lg shadow-primary/20' 
            : 'cursor-default border-border'
        )}
        onClick={handleClick}
      >
        {/* Placement mode overlay */}
        {clickMode !== 'none' && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none z-[30]">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 animate-pulse">
              {clickMode === 'incident' ? (
                <>
                  <MapPin className="w-4 h-4" />
                  Click on the map to place incident
                </>
              ) : (
                <>
                  <Factory className="w-4 h-4" />
                  Click on the map to place source
                </>
              )}
            </div>
          </div>
        )}
        
        <img
          src={siteMap.image_url}
          alt={siteMap.name}
          className="w-full h-auto"
          draggable={false}
        />
        
        {/* Dispersion plumes from defined odour sources */}
        {showPlumes && hasWeatherData && odourSources.map((source) => {
          const pos = getSourcePosition(source);
          if (!pos) return null;
          
          return (
            <DispersionPlume
              key={`plume-source-${source.id}-${latestSnapshot.id}`}
              sourceX={pos.x}
              sourceY={pos.y}
              windDirection={latestSnapshot.wind_direction_deg!}
              windSpeed={latestSnapshot.wind_speed_mps!}
              stabilityClass={latestSnapshot.stability_class!}
              intensity={source.base_intensity || 3}
              containerWidth={containerWidth}
            />
          );
        })}
        
        {/* Odour source markers */}
        {odourSources.map((source) => {
          const pos = getSourcePosition(source);
          if (!pos) return null;
          
          return (
            <div
              key={`source-${source.id}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onMouseEnter={() => setHoveredSource(source.id)}
              onMouseLeave={() => setHoveredSource(null)}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shadow-lg transition-transform bg-primary border-2 border-primary-foreground',
                  hoveredSource === source.id && 'scale-110'
                )}
              >
                <Factory className="w-4 h-4 text-primary-foreground" />
              </div>
              
              {hoveredSource === source.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-popover text-popover-foreground rounded-lg p-2 shadow-lg text-xs z-20">
                  <p className="font-semibold">{source.name || 'Odour Source'}</p>
                  <p className="text-muted-foreground">
                    Intensity: {source.base_intensity || 3}/5
                  </p>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Incident markers */}
        {incidents.map((incident) => {
          const pos = getIncidentPosition(incident);
          return (
            <div
              key={incident.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
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
              
              {hoveredIncident === incident.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-popover text-popover-foreground rounded-lg p-2 shadow-lg text-xs z-20">
                  <p className="font-semibold">
                    {new Date(incident.occurred_at).toLocaleDateString()}
                  </p>
                  {incident.intensity && (
                    <p>Intensity: {incident.intensity}/5</p>
                  )}
                  {incident.description && (
                    <p className="text-muted-foreground line-clamp-2">{incident.description}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* GPS Location marker */}
        {gpsPosition && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{
              left: `${gpsPosition.x}%`,
              top: `${gpsPosition.y}%`,
            }}
          >
            {/* Accuracy ring */}
            <div 
              className="absolute rounded-full bg-blue-500/20 border border-blue-500/40 animate-pulse"
              style={{
                width: `${Math.min(80, (geo.coords?.accuracy ?? 10) / 2)}px`,
                height: `${Math.min(80, (geo.coords?.accuracy ?? 10) / 2)}px`,
                transform: 'translate(-50%, -50%)',
                left: '50%',
                top: '50%',
              }}
            />
            {/* Center dot */}
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
              <Navigation className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        )}
        
        {/* Weather info panel */}
        {showPlumes && hasWeatherData && (
          <PlumeInfoPanel
            windSpeed={latestSnapshot.wind_speed_mps!}
            windDirection={latestSnapshot.wind_direction_deg!}
            stabilityClass={latestSnapshot.stability_class!}
            temperature={latestSnapshot.temperature_c}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-lg bg-primary flex items-center justify-center">
            <Factory className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
          <span>Odour source</span>
        </div>
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
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
          <span>Your location</span>
        </div>
      </div>
      
      {showPlumes && hasWeatherData && <PlumeLegend />}
    </div>
  );
}
