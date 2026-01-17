import { useState } from 'react';
import { Plus, Map, List, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSiteMaps, useOdourIncidents } from '@/hooks/useOdourMapping';
import SiteMapUpload from '@/components/odour/SiteMapUpload';
import InteractiveSiteMap from '@/components/odour/InteractiveSiteMap';
import OdourIncidentForm from '@/components/odour/OdourIncidentForm';
import OdourIncidentReport from '@/components/odour/OdourIncidentReport';
import { format } from 'date-fns';
import { ODOUR_TYPES, INCIDENT_STATUSES, type OdourIncident, type SiteMap } from '@/types/odour';
import { cn } from '@/lib/utils';

export default function OdourMap() {
  const [showUpload, setShowUpload] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedMap, setSelectedMap] = useState<SiteMap | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<OdourIncident | null>(null);

  const { data: siteMaps = [], isLoading: mapsLoading } = useSiteMaps();
  const { data: incidents = [], isLoading: incidentsLoading } = useOdourIncidents();

  const handleMapClick = (position: { x: number; y: number }) => {
    setClickPosition(position);
    setShowIncidentForm(true);
  };

  const handleIncidentClick = (incident: OdourIncident) => {
    setSelectedIncident(incident);
    setShowReport(true);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Odour Map & Reports</h1>
            <p className="text-muted-foreground">Record and track odour incidents on your site map</p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Site Map
          </Button>
        </div>

        <Tabs defaultValue="map" className="space-y-4">
          <TabsList>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Site Map
            </TabsTrigger>
            <TabsTrigger value="incidents" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Incidents ({incidents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            {mapsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : siteMaps.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Map className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Site Maps</h3>
                <p className="text-muted-foreground mb-4">Upload a site map or Google Earth view to get started</p>
                <Button onClick={() => setShowUpload(true)}>Upload Site Map</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {siteMaps.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {siteMaps.map((map) => (
                      <Button
                        key={map.id}
                        variant={selectedMap?.id === map.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedMap(map)}
                      >
                        {map.name}
                      </Button>
                    ))}
                  </div>
                )}
                <InteractiveSiteMap
                  siteMap={selectedMap || siteMaps[0]}
                  incidents={incidents}
                  onMapClick={handleMapClick}
                  onIncidentClick={handleIncidentClick}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="incidents">
            {incidentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Incidents Recorded</h3>
                <p className="text-muted-foreground">Click on a site map to record an odour incident</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => {
                  const odourType = ODOUR_TYPES.find(t => t.value === incident.odour_type);
                  const status = INCIDENT_STATUSES.find(s => s.value === incident.status);
                  return (
                    <div
                      key={incident.id}
                      className="border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleIncidentClick(incident)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{odourType?.label || incident.odour_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(incident.incident_at), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {incident.intensity && (
                            <span className="text-sm">Intensity: {incident.intensity}/5</span>
                          )}
                          <span className={cn('px-2 py-1 rounded-full text-xs text-white', status?.color)}>
                            {status?.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SiteMapUpload open={showUpload} onClose={() => setShowUpload(false)} />
      <OdourIncidentForm
        open={showIncidentForm}
        onClose={() => { setShowIncidentForm(false); setClickPosition(null); }}
        clickPosition={clickPosition}
        siteMap={selectedMap || siteMaps[0] || null}
      />
      <OdourIncidentReport
        open={showReport}
        onClose={() => { setShowReport(false); setSelectedIncident(null); }}
        incident={selectedIncident}
      />
    </AppLayout>
  );
}
