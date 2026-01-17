import { useState, useMemo } from 'react';
import { Plus, Map, List, FileText, History, Calendar, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteMaps, useOdourIncidents } from '@/hooks/useOdourMapping';
import SiteMapUpload from '@/components/odour/SiteMapUpload';
import InteractiveSiteMap from '@/components/odour/InteractiveSiteMap';
import OdourIncidentForm from '@/components/odour/OdourIncidentForm';
import OdourIncidentReport from '@/components/odour/OdourIncidentReport';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, startOfWeek, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ODOUR_TYPES, INCIDENT_STATUSES, FIDOL_SCALE, type OdourIncident, type SiteMap } from '@/types/odour';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

export default function OdourMap() {
  const [showUpload, setShowUpload] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedMap, setSelectedMap] = useState<SiteMap | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<OdourIncident | null>(null);
  
  // Date range for history filter - default to last 3 months
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(startOfMonth(new Date()), 2),
    to: endOfMonth(new Date()),
  });

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

  // Filter resolved incidents for history view
  const resolvedIncidents = useMemo(() => {
    return incidents.filter(incident => {
      // Only show resolved or closed incidents
      if (incident.status !== 'resolved' && incident.status !== 'closed') return false;
      
      // Apply date range filter
      if (dateRange?.from && dateRange?.to) {
        const incidentDate = new Date(incident.incident_at);
        return isWithinInterval(incidentDate, { start: dateRange.from, end: dateRange.to });
      }
      
      return true;
    });
  }, [incidents, dateRange]);

  // Active (non-resolved) incidents count
  const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');

  // Analytics data
  const analyticsData = useMemo(() => {
    if (incidents.length === 0) return null;

    // Apply date range filter for analytics
    const filteredIncidents = incidents.filter(incident => {
      if (dateRange?.from && dateRange?.to) {
        const incidentDate = new Date(incident.incident_at);
        return isWithinInterval(incidentDate, { start: dateRange.from, end: dateRange.to });
      }
      return true;
    });

    // Incidents over time (by month)
    const timeRange = dateRange?.from && dateRange?.to 
      ? { start: dateRange.from, end: dateRange.to }
      : { start: subMonths(new Date(), 11), end: new Date() };
    
    const months = eachMonthOfInterval(timeRange);
    const incidentsOverTime = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const count = filteredIncidents.filter(i => {
        const date = new Date(i.incident_at);
        return date >= monthStart && date <= monthEnd;
      }).length;
      return {
        month: format(month, 'MMM yyyy'),
        incidents: count,
      };
    });

    // By odour type
    const byType: Record<string, number> = {};
    filteredIncidents.forEach(incident => {
      const type = incident.odour_type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    const typeData = Object.entries(byType)
      .map(([type, count]) => ({
        name: ODOUR_TYPES.find(t => t.value === type)?.label || type,
        value: count,
        type,
      }))
      .sort((a, b) => b.value - a.value);

    // By intensity
    const byIntensity = [1, 2, 3, 4, 5].map(level => ({
      level: `${level}`,
      label: FIDOL_SCALE.intensity.find(i => i.value === level)?.label || '',
      count: filteredIncidents.filter(i => i.intensity === level).length,
    }));

    // By status
    const byStatus = INCIDENT_STATUSES.map(status => ({
      status: status.label,
      count: filteredIncidents.filter(i => i.status === status.value).length,
      color: status.color,
    }));

    // Summary stats
    const avgIntensity = filteredIncidents.filter(i => i.intensity).length > 0
      ? filteredIncidents.reduce((sum, i) => sum + (i.intensity || 0), 0) / filteredIncidents.filter(i => i.intensity).length
      : 0;

    return {
      incidentsOverTime,
      typeData,
      byIntensity,
      byStatus,
      totalIncidents: filteredIncidents.length,
      avgIntensity: avgIntensity.toFixed(1),
      highIntensityCount: filteredIncidents.filter(i => (i.intensity || 0) >= 4).length,
    };
  }, [incidents, dateRange]);

  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#f97316',
    '#14b8a6',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
  ];

  const INTENSITY_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

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
              Active ({activeIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History ({resolvedIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
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
            ) : activeIncidents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Active Incidents</h3>
                <p className="text-muted-foreground">Click on a site map to record an odour incident</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeIncidents.map((incident) => {
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

          <TabsContent value="history" className="space-y-4">
            {/* Date Range Filter */}
            <div className="flex items-center gap-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(startOfMonth(new Date()), 0),
                    to: endOfMonth(new Date()),
                  })}
                >
                  This Month
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(startOfMonth(new Date()), 2),
                    to: endOfMonth(new Date()),
                  })}
                >
                  Last 3 Months
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(startOfMonth(new Date()), 11),
                    to: endOfMonth(new Date()),
                  })}
                >
                  Last Year
                </Button>
              </div>
            </div>

            {incidentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : resolvedIncidents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Resolved Incidents</h3>
                <p className="text-muted-foreground">
                  {dateRange?.from && dateRange?.to 
                    ? `No incidents found between ${format(dateRange.from, 'PP')} and ${format(dateRange.to, 'PP')}`
                    : 'Resolved incidents will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedIncidents.map((incident) => {
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
                            Reported: {format(new Date(incident.incident_at), 'PPp')}
                          </p>
                          {incident.resolved_at && (
                            <p className="text-sm text-green-600">
                              Resolved: {format(new Date(incident.resolved_at), 'PPp')}
                            </p>
                          )}
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

          <TabsContent value="analytics" className="space-y-6">
            {/* Date Range Filter for Analytics */}
            <div className="flex items-center gap-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(startOfMonth(new Date()), 0),
                    to: endOfMonth(new Date()),
                  })}
                >
                  This Month
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(startOfMonth(new Date()), 2),
                    to: endOfMonth(new Date()),
                  })}
                >
                  Last 3 Months
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(startOfMonth(new Date()), 11),
                    to: endOfMonth(new Date()),
                  })}
                >
                  Last Year
                </Button>
              </div>
            </div>

            {incidentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : !analyticsData || analyticsData.totalIncidents === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Data Available</h3>
                <p className="text-muted-foreground">
                  Record odour incidents to see analytics
                </p>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Incidents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analyticsData.totalIncidents}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Intensity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{analyticsData.avgIntensity}<span className="text-lg text-muted-foreground">/5</span></p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">High Intensity (4-5)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-red-500">{analyticsData.highIntensityCount}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Incidents Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Incidents Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.incidentsOverTime}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="month" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            allowDecimals={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar 
                            dataKey="incidents" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* By Odour Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle>By Odour Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData.typeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {analyticsData.typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Intensity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>By Intensity Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.byIntensity} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              allowDecimals={false}
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="label" 
                              width={100}
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value, name) => [value, 'Incidents']}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                              {analyticsData.byIntensity.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={INTENSITY_COLORS[index]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* By Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>By Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {analyticsData.byStatus.map((status) => (
                        <div 
                          key={status.status} 
                          className="text-center p-4 rounded-xl border border-border"
                        >
                          <p className="text-3xl font-bold">{status.count}</p>
                          <p className="text-sm text-muted-foreground">{status.status}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
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
