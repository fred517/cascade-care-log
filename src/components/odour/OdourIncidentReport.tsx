import { format } from 'date-fns';
import { FileText, Download, Calendar, Wind, MapPin, AlertTriangle, CheckCircle, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ODOUR_TYPES, FIDOL_SCALE, INCIDENT_STATUSES, type OdourIncident } from '@/types/odour';
import { cn } from '@/lib/utils';
import { useUpdateOdourIncident } from '@/hooks/useOdourMapping';
import { useAuth } from '@/hooks/useAuth';
import { useSite } from '@/hooks/useSite';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

interface OdourIncidentReportProps {
  open: boolean;
  onClose: () => void;
  incident: OdourIncident | null;
}

export default function OdourIncidentReport({ open, onClose, incident }: OdourIncidentReportProps) {
  const { user } = useAuth();
  const { site } = useSite();
  const updateIncident = useUpdateOdourIncident();

  // Fetch reporter profile
  const { data: reporterProfile } = useQuery({
    queryKey: ['profile', incident?.created_by],
    queryFn: async () => {
      if (!incident?.created_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', incident.created_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!incident?.created_by,
  });

  if (!incident) return null;

  const odourTypeLabel = ODOUR_TYPES.find(t => t.value === incident.odour_type)?.label || incident.odour_type;
  const statusInfo = INCIDENT_STATUSES.find(s => s.value === incident.status);
  const isResolved = incident.status === 'resolved' || incident.status === 'closed';
  const reporterName = reporterProfile?.display_name || reporterProfile?.email || 'Unknown';

  const handleResolve = async () => {
    await updateIncident.mutateAsync({
      id: incident.id,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id || null,
    });
    onClose();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Helper function to add text with wrapping
    const addText = (text: string, x: number, yPos: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, yPos);
        return lines.length * 6;
      }
      doc.text(text, x, yPos);
      return 6;
    };

    // Header with site info
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    addText('ODOUR INCIDENT REPORT', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    // Site Name
    if (site?.name) {
      addText(`Site: ${site.name}`, margin, y);
      y += 6;
    }
    
    // Site Address
    if ((site as any)?.address) {
      addText(`Address: ${(site as any).address}`, margin, y);
      y += 6;
    }

    // Reporter Info
    addText(`Reported By: ${reporterName}`, margin, y);
    y += 6;
    addText(`Report Date: ${format(new Date(incident.incident_at), 'PPpp')}`, margin, y);
    y += 10;

    doc.setTextColor(0, 0, 0);

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Incident Details Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('INCIDENT DETAILS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addText(`Status: ${statusInfo?.label || incident.status}`, margin, y);
    y += 6;
    addText(`Odour Type: ${odourTypeLabel}`, margin, y);
    y += 10;

    // FIDOL Assessment
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('FIDOL ASSESSMENT', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const frequencyLabel = incident.frequency 
      ? `${incident.frequency}/5 - ${FIDOL_SCALE.frequency.find(f => f.value === incident.frequency)?.label}`
      : 'Not recorded';
    addText(`Frequency: ${frequencyLabel}`, margin, y);
    y += 6;

    const intensityLabel = incident.intensity 
      ? `${incident.intensity}/5 - ${FIDOL_SCALE.intensity.find(i => i.value === incident.intensity)?.label}`
      : 'Not recorded';
    addText(`Intensity: ${intensityLabel}`, margin, y);
    y += 6;

    addText(`Duration: ${incident.duration ? `${incident.duration} minutes` : 'Not recorded'}`, margin, y);
    y += 6;

    const offensivenessLabel = incident.offensiveness 
      ? `${incident.offensiveness}/5 - ${FIDOL_SCALE.offensiveness.find(o => o.value === incident.offensiveness)?.label}`
      : 'Not recorded';
    addText(`Offensiveness: ${offensivenessLabel}`, margin, y);
    y += 6;

    addText(`Location Impact: ${incident.location_impact || 'Not specified'}`, margin, y);
    y += 10;

    // Weather Conditions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('WEATHER CONDITIONS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (incident.wind_speed !== null) {
      addText(`Wind Speed: ${incident.wind_speed} m/s`, margin, y);
      y += 6;
      addText(`Wind Direction: ${incident.wind_direction_text || ''} (${incident.wind_direction}°)`, margin, y);
      y += 6;
      addText(`Temperature: ${incident.temperature}°C`, margin, y);
      y += 6;
      addText(`Humidity: ${incident.humidity}%`, margin, y);
      y += 6;
      addText(`Pressure: ${incident.pressure} hPa`, margin, y);
      y += 6;
      addText(`Conditions: ${incident.weather_description || 'N/A'}`, margin, y);
      y += 10;
    } else {
      addText('No weather data recorded', margin, y);
      y += 10;
    }

    // Source & Observations
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('SOURCE & OBSERVATIONS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addText(`Suspected Source: ${incident.source_suspected || 'Not specified'}`, margin, y);
    y += 6;

    if (incident.notes) {
      y += addText(`Notes: ${incident.notes}`, margin, y, pageWidth - margin * 2);
      y += 4;
    }
    y += 6;

    // Corrective Actions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('CORRECTIVE ACTIONS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (incident.corrective_actions) {
      y += addText(`Actions Taken: ${incident.corrective_actions}`, margin, y, pageWidth - margin * 2);
      y += 4;
    } else {
      addText('Actions Taken: None recorded', margin, y);
      y += 6;
    }

    addText(`Follow-up Date: ${incident.follow_up_date ? format(new Date(incident.follow_up_date), 'PP') : 'Not scheduled'}`, margin, y);
    y += 6;

    if (incident.follow_up_notes) {
      y += addText(`Follow-up Notes: ${incident.follow_up_notes}`, margin, y, pageWidth - margin * 2);
    }
    y += 10;

    // Resolution
    if (incident.resolved_at) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      addText('RESOLUTION', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      addText(`Resolved At: ${format(new Date(incident.resolved_at), 'PPpp')}`, margin, y);
      y += 10;
    }

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    addText(`Report Generated: ${format(new Date(), 'PPpp')}`, margin, y);
    y += 5;
    addText(`Incident ID: ${incident.id}`, margin, y);

    // Save PDF
    const fileName = `odour-incident-${format(new Date(incident.incident_at), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
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
            <div className="flex items-center gap-2">
              {!isResolved && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleResolve}
                  disabled={updateIncident.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {updateIncident.isPending ? 'Resolving...' : 'Resolve'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Site & Reporter Info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{site?.name || 'Unknown Site'}</span>
              {(site as any)?.address && (
                <span className="text-muted-foreground">• {(site as any).address}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Reported by: <span className="font-medium">{reporterName}</span></span>
            </div>
          </div>

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
