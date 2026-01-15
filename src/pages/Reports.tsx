import { useState, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricChart } from '@/components/charts/MetricChart';
import { useReadings } from '@/hooks/useReadings';
import { useSite } from '@/hooks/useSite';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { METRICS, MetricType, Reading, Threshold } from '@/types/wastewater';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Loader2,
  BarChart3,
  Table as TableIcon,
  Printer,
  FileDown
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ViewMode = 'table' | 'charts';

interface DateRange {
  from: Date;
  to: Date;
}

const presetRanges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export default function Reports() {
  const { profile } = useAuth();
  const { site, loading: siteLoading } = useSite();
  const { thresholds, getMetricThreshold } = useReadings();
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Fetch readings for date range
  const fetchReportData = async () => {
    if (!site) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('site_id', site.id)
        .gte('recorded_at', startOfDay(dateRange.from).toISOString())
        .lte('recorded_at', endOfDay(dateRange.to).toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Apply preset range
  const applyPreset = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  // Generate report
  const handleGenerateReport = () => {
    fetchReportData();
  };

  // Convert to chart format
  const chartReadings: Reading[] = useMemo(() => {
    return readings.map(r => ({
      id: r.id,
      metricId: r.metric_id as MetricType,
      value: Number(r.value),
      timestamp: new Date(r.recorded_at),
      enteredBy: 'Operator',
      siteId: r.site_id,
      notes: r.notes || undefined,
    }));
  }, [readings]);

  // Chart thresholds
  const chartThresholds: Threshold[] = useMemo(() => {
    return thresholds.map(t => ({
      metricId: t.metric_id as MetricType,
      min: t.min_value,
      max: t.max_value,
      enabled: t.enabled,
      siteId: t.site_id,
    }));
  }, [thresholds]);

  // Calculate statistics per metric
  const metricStats = useMemo(() => {
    const stats: Record<MetricType, { 
      count: number; 
      min: number; 
      max: number; 
      avg: number; 
      trend: 'up' | 'down' | 'stable';
      outOfRange: number;
    }> = {} as any;

    Object.keys(METRICS).forEach(metricId => {
      const metricReadings = readings
        .filter(r => r.metric_id === metricId)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

      if (metricReadings.length === 0) {
        stats[metricId as MetricType] = { 
          count: 0, min: 0, max: 0, avg: 0, trend: 'stable', outOfRange: 0 
        };
        return;
      }

      const values = metricReadings.map(r => Number(r.value));
      const threshold = getMetricThreshold(metricId as MetricType);
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (metricReadings.length >= 3) {
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const diff = avgSecond - avgFirst;
        const range = Math.max(...values) - Math.min(...values);
        
        if (range > 0 && Math.abs(diff) > range * 0.1) {
          trend = diff > 0 ? 'up' : 'down';
        }
      }

      // Count out of range
      const outOfRange = threshold 
        ? values.filter(v => v < threshold.min_value || v > threshold.max_value).length
        : 0;

      stats[metricId as MetricType] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        trend,
        outOfRange,
      };
    });

    return stats;
  }, [readings, getMetricThreshold]);

  // Export to CSV
  const exportToCSV = () => {
    if (readings.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Time', 'Metric', 'Value', 'Unit', 'Notes'];
    const rows = readings.map(r => {
      const metric = METRICS[r.metric_id as MetricType];
      const date = new Date(r.recorded_at);
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm'),
        metric?.name || r.metric_id,
        r.value,
        metric?.unit || '',
        r.notes || '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wastewater-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report exported to CSV');
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (readings.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExportingPDF(true);
    toast.info('Generating PDF report...');

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text('Wastewater Process Report', margin, yPosition);
      yPosition += 10;

      // Site and date info
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Site: ${site?.name || 'Unknown Site'}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Period: ${format(dateRange.from, 'MMMM d, yyyy')} - ${format(dateRange.to, 'MMMM d, yyyy')}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')} by ${profile?.display_name || 'Operator'}`, margin, yPosition);
      yPosition += 10;

      // Divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Summary Statistics Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text('Summary Statistics', margin, yPosition);
      yPosition += 8;

      // Stats table header
      const statsColWidths = [35, 25, 25, 25, 25, 30];
      const statsHeaders = ['Metric', 'Count', 'Min', 'Max', 'Avg', 'Status'];
      
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 4, contentWidth, 8, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      
      let xPos = margin + 2;
      statsHeaders.forEach((header, idx) => {
        pdf.text(header, xPos, yPosition);
        xPos += statsColWidths[idx];
      });
      yPosition += 8;

      // Stats table content
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(33, 33, 33);
      
      Object.entries(METRICS).forEach(([id, metric]) => {
        const stats = metricStats[id as MetricType];
        if (!stats || stats.count === 0) return;

        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        xPos = margin + 2;
        pdf.setFontSize(8);
        pdf.text(metric.name, xPos, yPosition);
        xPos += statsColWidths[0];
        pdf.text(stats.count.toString(), xPos, yPosition);
        xPos += statsColWidths[1];
        pdf.text(stats.min.toFixed(metric.precision), xPos, yPosition);
        xPos += statsColWidths[2];
        pdf.text(stats.max.toFixed(metric.precision), xPos, yPosition);
        xPos += statsColWidths[3];
        pdf.text(stats.avg.toFixed(metric.precision) + ' ' + metric.unit, xPos, yPosition);
        xPos += statsColWidths[4];
        
        if (stats.outOfRange > 0) {
          pdf.setTextColor(200, 100, 0);
          pdf.text(`${stats.outOfRange} out of range`, xPos, yPosition);
          pdf.setTextColor(33, 33, 33);
        } else {
          pdf.setTextColor(50, 150, 50);
          pdf.text('Normal', xPos, yPosition);
          pdf.setTextColor(33, 33, 33);
        }
        yPosition += 6;
      });

      yPosition += 8;

      // Capture charts if in chart view
      if (reportContentRef.current && viewMode === 'charts') {
        const chartsElement = reportContentRef.current.querySelector('.charts-container');
        if (chartsElement) {
          try {
            const canvas = await html2canvas(chartsElement as HTMLElement, {
              backgroundColor: '#ffffff',
              scale: 2,
              logging: false,
              useCORS: true,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            if (yPosition + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Trend Charts', margin, yPosition);
            yPosition += 8;
            
            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          } catch (err) {
            console.error('Error capturing charts:', err);
          }
        }
      }

      // Readings Table
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text('Readings Data', margin, yPosition);
      yPosition += 8;

      // Table headers
      const colWidths = [30, 20, 45, 30, 25];
      const headers = ['Date', 'Time', 'Metric', 'Value', 'Status'];
      
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 4, contentWidth, 8, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      
      xPos = margin + 2;
      headers.forEach((header, idx) => {
        pdf.text(header, xPos, yPosition);
        xPos += colWidths[idx];
      });
      yPosition += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      
      readings.forEach((reading, index) => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = margin;
          
          // Repeat header on new page
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 4, contentWidth, 8, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(60, 60, 60);
          
          xPos = margin + 2;
          headers.forEach((header, idx) => {
            pdf.text(header, xPos, yPosition);
            xPos += colWidths[idx];
          });
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
        }

        const metric = METRICS[reading.metric_id as MetricType];
        if (!metric) return;
        
        const threshold = getMetricThreshold(reading.metric_id as MetricType);
        const value = Number(reading.value);
        const isOutOfRange = threshold && (value < threshold.min_value || value > threshold.max_value);
        const date = new Date(reading.recorded_at);
        
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition - 3, contentWidth, 6, 'F');
        }
        
        pdf.setTextColor(33, 33, 33);
        xPos = margin + 2;
        pdf.text(format(date, 'MMM d, yyyy'), xPos, yPosition);
        xPos += colWidths[0];
        pdf.text(format(date, 'h:mm a'), xPos, yPosition);
        xPos += colWidths[1];
        pdf.text(metric.name, xPos, yPosition);
        xPos += colWidths[2];
        pdf.text(`${value.toFixed(metric.precision)} ${metric.unit}`, xPos, yPosition);
        xPos += colWidths[3];
        
        if (isOutOfRange) {
          pdf.setTextColor(200, 100, 0);
          pdf.text('Out of Range', xPos, yPosition);
        } else {
          pdf.setTextColor(50, 150, 50);
          pdf.text('Normal', xPos, yPosition);
        }
        
        yPosition += 6;
      });

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
        pdf.text(
          'Generated by Wastewater Process Tracker',
          margin,
          pageHeight - 8
        );
      }

      // Save the PDF
      const filename = `wastewater-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);
      
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setExportingPDF(false);
    }
  };

  if (siteLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto print:max-w-none">
        {/* Header */}
        <div className="mb-8 print:mb-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
          <p className="text-muted-foreground">
            Generate reports for readings and trends within a selected date range
          </p>
        </div>

        {/* Date Range Selection */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6 print:hidden">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Select Date Range
          </h2>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {presetRanges.map(preset => (
              <button
                key={preset.days}
                onClick={() => applyPreset(preset.days)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  subDays(new Date(), preset.days).toDateString() === dateRange.from.toDateString()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                From Date
              </label>
              <input
                type="date"
                value={format(dateRange.from, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange(prev => ({ 
                  ...prev, 
                  from: new Date(e.target.value) 
                }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                To Date
              </label>
              <input
                type="date"
                value={format(dateRange.to, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange(prev => ({ 
                  ...prev, 
                  to: new Date(e.target.value) 
                }))}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2 flex items-end gap-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {readings.length > 0 && (
          <>
            {/* Report Header (for print) */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold">Wastewater Process Report</h1>
              <p className="text-sm text-muted-foreground">
                {site?.name} | {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                Generated by: {profile?.display_name || 'Operator'} on {format(new Date(), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'table'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <TableIcon className="w-4 h-4" />
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('charts')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'charts'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <BarChart3 className="w-4 h-4" />
                  Charts View
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={exportingPDF}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm disabled:opacity-50"
                >
                  {exportingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  Export PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Summary Statistics
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')})
                </span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(METRICS).map(([id, metric]) => {
                  const stats = metricStats[id as MetricType];
                  if (!stats || stats.count === 0) return null;

                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedMetric(selectedMetric === id ? null : id as MetricType);
                        setViewMode('charts');
                      }}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all hover:shadow-md",
                        selectedMetric === id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{metric.name}</span>
                        {stats.trend === 'up' && <TrendingUp className="w-4 h-4 text-status-warning" />}
                        {stats.trend === 'down' && <TrendingDown className="w-4 h-4 text-status-info" />}
                        {stats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="text-xl font-bold font-mono text-foreground">
                        {stats.avg.toFixed(metric.precision)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{metric.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {stats.count} readings • {stats.min.toFixed(metric.precision)} - {stats.max.toFixed(metric.precision)}
                      </div>
                      {stats.outOfRange > 0 && (
                        <div className="text-xs text-status-warning mt-1">
                          {stats.outOfRange} out of range
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Metric</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Value</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground print:hidden">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((reading, index) => {
                        const metric = METRICS[reading.metric_id as MetricType];
                        if (!metric) return null;
                        
                        const threshold = getMetricThreshold(reading.metric_id as MetricType);
                        const value = Number(reading.value);
                        const isOutOfRange = threshold && (
                          value < threshold.min_value || value > threshold.max_value
                        );
                        const date = new Date(reading.recorded_at);
                        
                        return (
                          <tr 
                            key={reading.id} 
                            className={cn(
                              "border-b border-border last:border-0",
                              index % 2 === 0 ? "bg-card" : "bg-muted/20"
                            )}
                          >
                            <td className="p-4 text-sm text-foreground">
                              {format(date, 'MMM d, yyyy')}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {format(date, 'h:mm a')}
                            </td>
                            <td className="p-4">
                              <span className="font-medium text-foreground">{metric.name}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-mono">
                                {value.toFixed(metric.precision)} {metric.unit}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                isOutOfRange 
                                  ? "bg-status-warning/20 text-status-warning" 
                                  : "bg-status-normal/20 text-status-normal"
                              )}>
                                {isOutOfRange ? 'Out of Range' : 'Normal'}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate print:hidden">
                              {reading.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-border bg-muted/50 text-sm text-muted-foreground">
                  Showing {readings.length} readings
                </div>
              </div>
            )}

            {/* Charts View */}
            {viewMode === 'charts' && (
              <div ref={reportContentRef} className="space-y-6">
                <div className="charts-container">
                  {selectedMetric ? (
                    <div className="bg-card rounded-xl border border-border p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        {METRICS[selectedMetric].name} Trend
                      </h3>
                      <MetricChart
                        metricId={selectedMetric}
                        readings={chartReadings}
                        threshold={chartThresholds.find(t => t.metricId === selectedMetric)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.keys(METRICS).map(metricId => {
                        const metricReadings = chartReadings.filter(r => r.metricId === metricId);
                        if (metricReadings.length === 0) return null;

                        return (
                          <div key={metricId} className="bg-card rounded-xl border border-border p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                              {METRICS[metricId as MetricType].name}
                            </h3>
                            <MetricChart
                              metricId={metricId as MetricType}
                              readings={chartReadings}
                              threshold={chartThresholds.find(t => t.metricId === metricId)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {readings.length === 0 && !loading && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Report Generated</h3>
            <p className="text-muted-foreground mb-4">
              Select a date range and click "Generate Report" to view readings and trends.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
