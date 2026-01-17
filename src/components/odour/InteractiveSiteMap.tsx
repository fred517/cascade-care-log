import { useState, useRef } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteMap, OdourIncident } from '@/types/odour';

interface InteractiveSiteMapProps {
  siteMap: SiteMap;
  incidents: OdourIncident[];
  onMapClick: (position: { x: number; y: number }) => void;
  onIncidentClick?: (incident: OdourIncident) => void;
}

export default function InteractiveSiteMap({ siteMap, incidents, onMapClick, onIncidentClick }: InteractiveSiteMapProps) {
  const [hoveredIncident, setHoveredIncident] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

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

  // Filter to show only recent incidents (last 7 days) or open ones
  const visibleIncidents = incidents.filter(incident => {
    if (incident.site_map_id !== siteMap.id) return false;
    if (incident.status === 'open' || incident.status === 'investigating') return true;
    const incidentDate = new Date(incident.incident_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return incidentDate >= sevenDaysAgo;
  });

  return (
    <div className="relative">
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
    </div>
  );
}
