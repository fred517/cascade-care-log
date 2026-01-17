import { format } from 'date-fns';
import { FileText, Download, Calendar, Wind, MapPin, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FIDOL_SCALE, type OdourIncident } from '@/types/odour';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

interface OdourIncidentReportProps {
  open: boolean;
  onClose: () => void;
  incident: OdourIncident | null;
  facilityName?: string;
}

export default function OdourIncidentReport({ open, onClose, incident, facilityName }: OdourIncidentReportProps) {
  const { user } = useAuth();

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

  const reporterName = reporterProfile?.display_name || reporterProfile?.email || 'Unknown';

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    const addText = (text: string, x: number, yPos: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, yPos);
        return lines.length * 6;
      }
      doc.text(text, x, yPos);
      return 6;
    };

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    addText('ODOUR INCIDENT REPORT', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    if (facilityName) {
      addText(`Facility: ${facilityName}`, margin, y);
      y += 6;
    }

    addText(`Reported By: ${reporterName}`, margin, y);
    y += 6;
    addText(`Report Date: ${format(new Date(incident.occurred_at), 'PPpp')}`, margin, y);
    y += 10;

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Incident Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('INCIDENT DETAILS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addText(`Location: ${incident.lat.toFixed(6)}, ${incident.lng.toFixed(6)}`, margin, y);
    y += 6;

    const intensityLabel = incident.intensity 
      ? `${incident.intensity}/5 - ${FIDOL_SCALE.intensity.find(i => i.value === incident.intensity)?.label}`
      : 'Not recorded';
    addText(`Intensity: ${intensityLabel}`, margin, y);
    y += 10;

    // Weather
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('WEATHER CONDITIONS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (incident.wind_speed !== null) {
      addText(`Wind Speed: ${incident.wind_speed} m/s`, margin, y);
      y += 6;
      addText(`Wind Direction: ${incident.wind_dir}°`, margin, y);
      y += 6;
      addText(`Temperature: ${incident.temperature}°C`, margin, y);
      y += 6;
      addText(`Humidity: ${incident.humidity}%`, margin, y);
      y += 10;
    } else {
      addText('No weather data recorded', margin, y);
      y += 10;
    }

    // Description
    if (incident.description) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      addText('DESCRIPTION', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      y += addText(incident.description, margin, y, pageWidth - margin * 2);
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

    const fileName = `odour-incident-${format(new Date(incident.occurred_at), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Odour Incident Report
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Facility & Reporter Info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            {facilityName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{facilityName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Reported by: <span className="font-medium">{reporterName}</span></span>
            </div>
          </div>

          {/* Header Info */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{format(new Date(incident.occurred_at), 'PPpp')}</p>
              <p className="text-sm text-muted-foreground">
                Location: {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Intensity */}
          <div>
            <h4 className="font-semibold mb-3">Intensity</h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-semibold">{incident.intensity ? `${incident.intensity}/5` : '—'}</p>
              {incident.intensity && (
                <p className="text-xs text-muted-foreground mt-1">
                  {FIDOL_SCALE.intensity.find(i => i.value === incident.intensity)?.label}
                </p>
              )}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="font-semibold">{incident.wind_speed} m/s @ {incident.wind_dir}°</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="font-semibold">{incident.temperature}°C</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="font-semibold">{incident.humidity}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No weather data recorded</p>
            )}
          </div>

          {/* Description */}
          {incident.description && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm">{incident.description}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
