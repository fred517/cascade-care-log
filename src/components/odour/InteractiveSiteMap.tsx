import { useState, useRef, useEffect } from 'react';
import { MapPin, AlertTriangle, Wind, History, Factory, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteMap, OdourIncident } from '@/types/odour';
import DispersionPlume, { PlumeInfoPanel, PlumeLegend } from './DispersionPlume';
import PlumePlayback, { usePlumePlayback } from './PlumePlayback';
import { useLatestWeatherSnapshot, useWeatherSnapshots } from '@/hooks/useWeatherSnapshots';
import { useOdourSources, useCreateOdourSource, type OdourSource } from '@/hooks/useOdourSources';
import { useCurrentPredictions, type OdourPrediction } from '@/hooks/useOdourPredictions';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
interface InteractiveSiteMapProps {
  siteMap: SiteMap;
  incidents: OdourIncident[];
  onMapClick: (position: { x: number; y: number }) => void;
  onIncidentClick?: (incident: OdourIncident) => void;
}

type PlumeMode = 'live' | 'history';
type ClickMode = 'incident' | 'source';

export default function InteractiveSiteMap({ siteMap, incidents, onMapClick, onIncidentClick }: InteractiveSiteMapProps) {
  const [hoveredIncident, setHoveredIncident] = useState<string | null>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [hoveredPrediction, setHoveredPrediction] = useState<string | null>(null);
  const [showPlumes, setShowPlumes] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [plumeMode, setPlumeMode] = useState<PlumeMode>('live');
  const [clickMode, setClickMode] = useState<ClickMode>('incident');
  const [containerWidth, setContainerWidth] = useState(800);
  const imageRef = useRef<HTMLDivElement>(null);
  
  const { data: latestSnapshot, isLoading: latestLoading } = useLatestWeatherSnapshot();
  const { data: historicalSnapshots = [], isLoading: historyLoading } = useWeatherSnapshots(48);
  const { data: odourSources = [] } = useOdourSources();
  const { data: predictions = [] } = useCurrentPredictions();
  const createSource = useCreateOdourSource();
  
  const {
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    currentSnapshot: playbackSnapshot,
  } = usePlumePlayback(historicalSnapshots);

  const activeSnapshot = plumeMode === 'live' ? latestSnapshot : playbackSnapshot;

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

  useEffect(() => {
    if (plumeMode === 'live') {
      setIsPlaying(false);
    }
  }, [plumeMode, setIsPlaying]);

  const handleClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (clickMode === 'source') {
      createSource.mutate({
        name: `Source ${odourSources.length + 1}`,
        geometry: { type: 'point', x, y },
        base_intensity: 3,
      });
      setClickMode('incident');
    } else {
      onMapClick({ x, y });
    }
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

  const visibleIncidents = incidents.filter(incident => {
    if (incident.site_map_id !== siteMap.id) return false;
    return incident.status === 'open' || incident.status === 'investigating';
  });

  const hasWeatherData = activeSnapshot && 
    activeSnapshot.wind_speed_mps !== null && 
    activeSnapshot.wind_direction_deg !== null &&
    activeSnapshot.stability_class;

  const hasHistoricalData = historicalSnapshots.length > 1;

  // Get source position for rendering
  const getSourcePosition = (source: OdourSource): { x: number; y: number } | null => {
    if (source.geometry.type === 'point' && source.geometry.x !== undefined && source.geometry.y !== undefined) {
      return { x: source.geometry.x, y: source.geometry.y };
    }
    // For polygons, use centroid
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
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-predictions"
              checked={showPredictions}
              onCheckedChange={setShowPredictions}
            />
            <Label htmlFor="show-predictions" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Layers className="w-4 h-4" />
              Predicted Plumes
            </Label>
          </div>
          
          {showPlumes && hasHistoricalData && (
            <Tabs value={plumeMode} onValueChange={(v) => setPlumeMode(v as PlumeMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="live" className="text-xs h-6 px-2">
                  <Wind className="w-3 h-3 mr-1" />
                  Live
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs h-6 px-2">
                  <History className="w-3 h-3 mr-1" />
                  History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={clickMode === 'source' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setClickMode(clickMode === 'source' ? 'incident' : 'source')}
              >
                <Factory className="w-4 h-4 mr-1" />
                {clickMode === 'source' ? 'Click map to place' : 'Add Source'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Define odour emission sources for plume modeling</p>
            </TooltipContent>
          </Tooltip>
          
          {(latestLoading || historyLoading) && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
        </div>
      </div>

      {/* Playback controls */}
      {showPlumes && plumeMode === 'history' && (
        <PlumePlayback
          snapshots={historicalSnapshots}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
        />
      )}

      <div
        ref={imageRef}
        className={cn(
          "relative rounded-xl overflow-hidden border border-border",
          clickMode === 'source' ? 'cursor-crosshair' : 'cursor-crosshair'
        )}
        onClick={handleClick}
      >
        <img
          src={siteMap.image_url}
          alt={siteMap.name}
          className="w-full h-auto"
          draggable={false}
        />
        
        {/* Predicted plume polygons from odour_predictions */}
        {showPredictions && predictions.length > 0 && (
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {predictions.map((prediction) => {
              if (!prediction.geometry?.coordinates?.length) return null;
              
              const points = prediction.geometry.coordinates
                .map(c => `${c.x},${c.y}`)
                .join(' ');
              
              const intensity = prediction.peak_intensity || 3;
              const opacity = Math.min(0.15 + (intensity * 0.08), 0.6);
              
              return (
                <polygon
                  key={`pred-${prediction.id}`}
                  points={points}
                  fill="hsl(var(--chart-3))"
                  fillOpacity={opacity}
                  stroke="hsl(var(--chart-3))"
                  strokeWidth="0.3"
                  strokeOpacity={0.8}
                  className="pointer-events-auto cursor-pointer transition-opacity hover:fill-opacity-[0.5]"
                  onMouseEnter={() => setHoveredPrediction(prediction.id)}
                  onMouseLeave={() => setHoveredPrediction(null)}
                />
              );
            })}
          </svg>
        )}
        
        {/* Prediction hover info */}
        {hoveredPrediction && predictions.find(p => p.id === hoveredPrediction) && (() => {
          const pred = predictions.find(p => p.id === hoveredPrediction)!;
          const centroid = pred.geometry.coordinates?.length
            ? {
                x: pred.geometry.coordinates.reduce((s, c) => s + c.x, 0) / pred.geometry.coordinates.length,
                y: pred.geometry.coordinates.reduce((s, c) => s + c.y, 0) / pred.geometry.coordinates.length,
              }
            : { x: 50, y: 50 };
          
          return (
            <div
              className="absolute z-20 bg-popover text-popover-foreground rounded-lg p-2 shadow-lg text-xs pointer-events-none"
              style={{
                left: `${centroid.x}%`,
                top: `${centroid.y}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="font-semibold">Predicted Plume</p>
              <p className="text-muted-foreground">
                Intensity: {pred.peak_intensity || 'N/A'}
              </p>
              {pred.valid_from && (
                <p className="text-muted-foreground">
                  Valid: {new Date(pred.valid_from).toLocaleTimeString()}
                  {pred.valid_to && ` - ${new Date(pred.valid_to).toLocaleTimeString()}`}
                </p>
              )}
              {pred.model_version && (
                <p className="text-muted-foreground text-[10px]">Model: {pred.model_version}</p>
              )}
            </div>
          );
        })()}
        
        {/* Dispersion plumes from defined odour sources */}
        {showPlumes && hasWeatherData && odourSources.map((source) => {
          const pos = getSourcePosition(source);
          if (!pos) return null;
          
          return (
            <DispersionPlume
              key={`plume-source-${source.id}-${activeSnapshot.id}`}
              sourceX={pos.x}
              sourceY={pos.y}
              windDirection={activeSnapshot.wind_direction_deg!}
              windSpeed={activeSnapshot.wind_speed_mps!}
              stabilityClass={activeSnapshot.stability_class!}
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
        {showPlumes && plumeMode === 'live' && hasWeatherData && (
          <PlumeInfoPanel
            windSpeed={activeSnapshot.wind_speed_mps!}
            windDirection={activeSnapshot.wind_direction_deg!}
            stabilityClass={activeSnapshot.stability_class!}
            temperature={activeSnapshot.temperature_c}
          />
        )}
        
        {/* Click instruction overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-black/10">
          <div className="bg-background/90 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            {clickMode === 'source' ? (
              <>
                <Factory className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Click to add odour source</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Click to report odour</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-lg bg-primary flex items-center justify-center">
            <Factory className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
          <span>Odour source</span>
        </div>
        {showPredictions && predictions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded bg-chart-3/40 border border-chart-3" />
            <span>Predicted plume ({predictions.length})</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>High intensity incident</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Low</span>
        </div>
      </div>
      
      {showPlumes && hasWeatherData && <PlumeLegend />}
    </div>
  );
}
