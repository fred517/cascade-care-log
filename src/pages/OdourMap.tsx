import { useState, useMemo } from 'react';
import { Plus, Map, List, FileText, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteMaps, useOdourIncidents } from '@/hooks/useOdourMapping';
import SiteMapUpload from '@/components/odour/SiteMapUpload';
import OdourIncidentForm from '@/components/odour/OdourIncidentForm';
import OdourIncidentReport from '@/components/odour/OdourIncidentReport';
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { FIDOL_SCALE, type OdourIncident, type SiteMap } from '@/types/odour';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Placeholder facility ID - in a real app this would come from context/route
const FACILITY_ID = 'placeholder-facility-id';

export default function OdourMap() {
  const [showUpload, setShowUpload] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedMap, setSelectedMap] = useState<SiteMap | null>(null);
  const [clickPosition, setClickPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<OdourIncident | null>(null);

  const { data: siteMaps = [], isLoading: mapsLoading } = useSiteMaps();
  const { data: incidents = [], isLoading: incidentsLoading } = useOdourIncidents(FACILITY_ID);

  const handleRecordIncident = () => {
    // For now, use a placeholder position - in a real app this would come from map click
    setClickPosition({ lat: 0, lng: 0 });
    setShowIncidentForm(true);
  };

  const handleIncidentClick = (incident: OdourIncident) => {
    setSelectedIncident(incident);
    setShowReport(true);
  };

  // Analytics data
  const analyticsData = useMemo(() => {
    if (incidents.length === 0) return null;

    const timeRange = { start: subMonths(new Date(), 11), end: new Date() };
    const months = eachMonthOfInterval(timeRange);
    
    const incidentsOverTime = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const count = incidents.filter(i => {
        const date = new Date(i.occurred_at);
        return date >= monthStart && date <= monthEnd;
      }).length;
      return {
        month: format(month, 'MMM yyyy'),
        incidents: count,
      };
    });

    // By intensity
    const byIntensity = [1, 2, 3, 4, 5].map(level => ({
      level: `${level}`,
      label: FIDOL_SCALE.intensity.find(i => i.value === level)?.label || '',
      count: incidents.filter(i => i.intensity === level).length,
    }));

    const avgIntensity = incidents.filter(i => i.intensity).length > 0
      ? incidents.reduce((sum, i) => sum + (i.intensity || 0), 0) / incidents.filter(i => i.intensity).length
      : 0;

    return {
      incidentsOverTime,
      byIntensity,
      totalIncidents: incidents.length,
      avgIntensity: avgIntensity.toFixed(1),
      highIntensityCount: incidents.filter(i => (i.intensity || 0) >= 4).length,
    };
  }, [incidents]);

  const INTENSITY_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Odour Incidents</h1>
            <p className="text-muted-foreground">Record and track odour incidents</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Map
            </Button>
            <Button onClick={handleRecordIncident}>
              <Plus className="w-4 h-4 mr-2" />
              Record Incident
            </Button>
          </div>
        </div>

        <Tabs defaultValue="incidents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="incidents" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Incidents ({incidents.length})
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Site Maps
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents">
            {incidentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Incidents</h3>
                <p className="text-muted-foreground mb-4">Record your first odour incident</p>
                <Button onClick={handleRecordIncident}>Record Incident</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleIncidentClick(incident)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {format(new Date(incident.occurred_at), 'PPp')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Location: {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                        </p>
                        {incident.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {incident.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {incident.intensity && (
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium text-white',
                            incident.intensity >= 4 ? 'bg-red-500' :
                            incident.intensity >= 3 ? 'bg-yellow-500' : 'bg-green-500'
                          )}>
                            Intensity: {incident.intensity}/5
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            {mapsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : siteMaps.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Map className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Site Maps</h3>
                <p className="text-muted-foreground mb-4">Upload a site map to visualize incidents</p>
                <Button onClick={() => setShowUpload(true)}>Upload Site Map</Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {siteMaps.map((map) => (
                  <Card key={map.id} className="overflow-hidden">
                    <img 
                      src={map.image_url} 
                      alt={map.name}
                      className="w-full h-40 object-cover"
                    />
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{map.name}</CardTitle>
                      {map.description && (
                        <p className="text-xs text-muted-foreground">{map.description}</p>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {!analyticsData ? (
              <div className="text-center py-12 text-muted-foreground">
                No data available for analytics
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Incidents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analyticsData.totalIncidents}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg Intensity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analyticsData.avgIntensity}/5</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        High Intensity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-red-500">{analyticsData.highIntensityCount}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Incidents Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Incidents Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.incidentsOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* By Intensity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Intensity Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.byIntensity} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis 
                            dataKey="level" 
                            type="category" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val, idx) => analyticsData.byIntensity[idx]?.label || val}
                          />
                          <Tooltip 
                            formatter={(value, name, props) => [
                              value, 
                              props.payload.label
                            ]}
                          />
                          <Bar 
                            dataKey="count" 
                            radius={[0, 4, 4, 0]}
                          >
                            {analyticsData.byIntensity.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={INTENSITY_COLORS[index]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <SiteMapUpload open={showUpload} onClose={() => setShowUpload(false)} />
        
        <OdourIncidentForm
          open={showIncidentForm}
          onClose={() => {
            setShowIncidentForm(false);
            setClickPosition(null);
          }}
          clickPosition={clickPosition}
          facilityId={FACILITY_ID}
        />
        
        <OdourIncidentReport
          open={showReport}
          onClose={() => {
            setShowReport(false);
            setSelectedIncident(null);
          }}
          incident={selectedIncident}
        />
      </div>
    </AppLayout>
  );
}
