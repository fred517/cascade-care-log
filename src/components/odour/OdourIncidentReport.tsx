import { format } from 'date-fns';
import { FileText, Download, Calendar, Wind, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ODOUR_TYPES, FIDOL_SCALE, INCIDENT_STATUSES, type OdourIncident } from '@/types/odour';
import { cn } from '@/lib/utils';

interface OdourIncidentReportProps {
  open: boolean;
  onClose: () => void;
  incident: OdourIncident | null;
}

export default function OdourIncidentReport({ open, onClose, incident }: OdourIncidentReportProps) {
  if (!incident) return null;

  const odourTypeLabel = ODOUR_TYPES.find(t => t.value === incident.odour_type)?.label || incident.odour_type;
  const statusInfo = INCIDENT_STATUSES.find(s => s.value === incident.status);

  const handleDownload = () => {
    // Generate text report
    const report = `
ODOUR INCIDENT REPORT
=====================

INCIDENT DETAILS
----------------
Date & Time: ${format(new Date(incident.incident_at), 'PPpp')}
Status: ${statusInfo?.label || incident.status}
Odour Type: ${odourTypeLabel}

FIDOL ASSESSMENT
----------------
Frequency: ${incident.frequency ? `${incident.frequency}/5 - ${FIDOL_SCALE.frequency.find(f => f.value === incident.frequency)?.label}` : 'Not recorded'}
Intensity: ${incident.intensity ? `${incident.intensity}/5 - ${FIDOL_SCALE.intensity.find(i => i.value === incident.intensity)?.label}` : 'Not recorded'}
Duration: ${incident.duration ? `${incident.duration} minutes` : 'Not recorded'}
Offensiveness: ${incident.offensiveness ? `${incident.offensiveness}/5 - ${FIDOL_SCALE.offensiveness.find(o => o.value === incident.offensiveness)?.label}` : 'Not recorded'}
Location Impact: ${incident.location_impact || 'Not specified'}

WEATHER CONDITIONS
------------------
Wind Speed: ${incident.wind_speed ? `${incident.wind_speed} m/s` : 'N/A'}
Wind Direction: ${incident.wind_direction_text ? `${incident.wind_direction_text} (${incident.wind_direction}°)` : 'N/A'}
Temperature: ${incident.temperature ? `${incident.temperature}°C` : 'N/A'}
Humidity: ${incident.humidity ? `${incident.humidity}%` : 'N/A'}
Pressure: ${incident.pressure ? `${incident.pressure} hPa` : 'N/A'}
Weather: ${incident.weather_description || 'N/A'}

SOURCE & OBSERVATIONS
---------------------
Suspected Source: ${incident.source_suspected || 'Not specified'}
Notes: ${incident.notes || 'None'}

CORRECTIVE ACTIONS
------------------
Actions Taken: ${incident.corrective_actions || 'None recorded'}
Follow-up Date: ${incident.follow_up_date ? format(new Date(incident.follow_up_date), 'PP') : 'Not scheduled'}
Follow-up Notes: ${incident.follow_up_notes || 'None'}

${incident.resolved_at ? `
RESOLUTION
----------
Resolved At: ${format(new Date(incident.resolved_at), 'PPpp')}
` : ''}

---
Report Generated: ${format(new Date(), 'PPpp')}
Incident ID: ${incident.id}
    `.trim();

    // Create blob and download
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `odour-incident-${format(new Date(incident.incident_at), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Odour Incident Report
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{format(new Date(incident.incident_at), 'PPpp')}</p>
                <p className="text-sm text-muted-foreground">{odourTypeLabel}</p>
              </div>
            </div>
            <div className={cn(
              'px-3 py-1 rounded-full text-sm font-medium text-white',
              statusInfo?.color || 'bg-muted'
            )}>
              {statusInfo?.label || incident.status}
            </div>
          </div>

          <Separator />

          {/* FIDOL Assessment */}
          <div>
            <h4 className="font-semibold mb-3">FIDOL Assessment</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="font-semibold">{incident.frequency ? `${incident.frequency}/5` : '—'}</p>
                {incident.frequency && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {FIDOL_SCALE.frequency.find(f => f.value === incident.frequency)?.label}
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Intensity</p>
                <p className="font-semibold">{incident.intensity ? `${incident.intensity}/5` : '—'}</p>
                {incident.intensity && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {FIDOL_SCALE.intensity.find(i => i.value === incident.intensity)?.label}
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold">{incident.duration ? `${incident.duration} min` : '—'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Offensiveness</p>
                <p className="font-semibold">{incident.offensiveness ? `${incident.offensiveness}/5` : '—'}</p>
                {incident.offensiveness && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {FIDOL_SCALE.offensiveness.find(o => o.value === incident.offensiveness)?.label}
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground">Location Impact</p>
                <p className="font-medium">{incident.location_impact || '—'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Weather Conditions */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Weather Conditions
            </h4>
            {incident.wind_speed !== null ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="font-semibold">{incident.wind_speed} m/s</p>
                  <p className="text-xs text-muted-foreground">
                    {incident.wind_direction_text} ({incident.wind_direction}°)
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="font-semibold">{incident.temperature}°C</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="font-semibold">{incident.humidity}%</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Pressure</p>
                  <p className="font-semibold">{incident.pressure} hPa</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-muted-foreground">Conditions</p>
                  <p className="font-medium capitalize">{incident.weather_description}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No weather data recorded</p>
            )}
          </div>

          <Separator />

          {/* Source & Notes */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Source & Observations
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Suspected Source</p>
                <p className="font-medium">{incident.source_suspected || 'Not specified'}</p>
              </div>
              {incident.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p>{incident.notes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Corrective Actions */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Corrective Actions
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Actions Taken</p>
                <p className={cn(!incident.corrective_actions && 'text-muted-foreground')}>
                  {incident.corrective_actions || 'None recorded'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Follow-up Date</p>
                  <p className="font-medium">
                    {incident.follow_up_date 
                      ? format(new Date(incident.follow_up_date), 'PP')
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Follow-up Notes</p>
                  <p className={cn(!incident.follow_up_notes && 'text-muted-foreground')}>
                    {incident.follow_up_notes || 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution */}
          {incident.resolved_at && (
            <>
              <Separator />
              <div className="flex items-center gap-3 bg-green-500/10 p-4 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Resolved</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(incident.resolved_at), 'PPpp')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
