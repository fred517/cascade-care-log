import { useState, useMemo, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricChart } from '@/components/charts/MetricChart';
import { ReportComparison } from '@/components/reports/ReportComparison';
import { useReadings } from '@/hooks/useReadings';
import { useSite } from '@/hooks/useSite';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PARAMETERS, METRICS, ParameterKey, MetricType, Reading, Threshold, PARAMETER_LIST, PARAMETER_ICONS } from '@/types/wastewater';
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
  FileDown,
  Save,
  FolderOpen,
  Trash2,
  X,
  Share2,
  Check,
  GitCompare
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ViewMode = 'table' | 'charts';
type ReportTab = 'standard' | 'comparison';

interface DateRange {
  from: Date;
  to: Date;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  date_range_type: string;
  date_range_days: number | null;
  custom_start_date: string | null;
  custom_end_date: string | null;
  default_title: string | null;
  default_notes: string | null;
  selected_metrics: string[] | null;
  default_view_mode: string | null;
  is_shared: boolean;
  user_id: string;
  site_id: string | null;
  created_at: string;
  updated_at: string;
}

const presetRanges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export default function Reports() {
  const { profile, user } = useAuth();
  const { site, loading: siteLoading } = useSite();
  const { thresholds, getMetricThreshold } = useReadings();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('standard');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [activeDatePreset, setActiveDatePreset] = useState<number | null>(7);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [reportNotes, setReportNotes] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Template state
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIsShared, setTemplateIsShared] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user, site]);

  const fetchTemplates = async () => {
    if (!user) return;
    
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as ReportTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!user || !templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSavingTemplate(true);
    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        user_id: user.id,
        site_id: site?.id || null,
        date_range_type: activeDatePreset ? 'preset' : 'custom',
        date_range_days: activeDatePreset || null,
        custom_start_date: activeDatePreset ? null : format(dateRange.from, 'yyyy-MM-dd'),
        custom_end_date: activeDatePreset ? null : format(dateRange.to, 'yyyy-MM-dd'),
        default_title: reportTitle.trim() || null,
        default_notes: reportNotes.trim() || null,
        selected_metrics: selectedMetric ? [selectedMetric] : null,
        default_view_mode: viewMode,
        is_shared: templateIsShared,
      };

      if (editingTemplateId) {
        const { error } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', editingTemplateId);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('report_templates')
          .insert(templateData);

        if (error) throw error;
        toast.success('Template saved successfully');
      }

      setShowSaveModal(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateIsShared(false);
      setEditingTemplateId(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Load template
  const handleLoadTemplate = (template: ReportTemplate) => {
    // Apply date range
    if (template.date_range_type === 'preset' && template.date_range_days) {
      setActiveDatePreset(template.date_range_days);
      setDateRange({
        from: subDays(new Date(), template.date_range_days),
        to: new Date(),
      });
    } else if (template.custom_start_date && template.custom_end_date) {
      setActiveDatePreset(null);
      setDateRange({
        from: new Date(template.custom_start_date),
        to: new Date(template.custom_end_date),
      });
    }

    // Apply other settings
    if (template.default_title) setReportTitle(template.default_title);
    if (template.default_notes) setReportNotes(template.default_notes);
    if (template.default_view_mode) setViewMode(template.default_view_mode as ViewMode);
    if (template.selected_metrics?.length) {
      setSelectedMetric(template.selected_metrics[0] as MetricType);
    } else {
      setSelectedMetric(null);
    }

    setShowLoadModal(false);
    toast.success(`Template "${template.name}" loaded`);
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Edit template
  const handleEditTemplate = (template: ReportTemplate) => {
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateIsShared(template.is_shared);
    setEditingTemplateId(template.id);
    setShowLoadModal(false);
    setShowSaveModal(true);
  };

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
    setActiveDatePreset(days);
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  // Handle custom date change
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    setActiveDatePreset(null);
    setDateRange(prev => ({
      ...prev,
      [type]: new Date(value),
    }));
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
      pdf.text(reportTitle || 'Wastewater Process Report', margin, yPosition);
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

      // Custom Notes Section (if provided)
      if (reportNotes.trim()) {
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(33, 33, 33);
        pdf.text('Notes & Comments', margin, yPosition);
        yPosition += 6;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        
        // Split notes into lines that fit the page width
        const notesLines = pdf.splitTextToSize(reportNotes.trim(), contentWidth - 4);
        notesLines.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 2, yPosition);
          yPosition += 5;
        });
        yPosition += 4;
      }

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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
              <p className="text-muted-foreground">
                Generate reports for readings and trends within a selected date range
              </p>
            </div>
            {activeTab === 'standard' && (
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => setShowLoadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                  <FolderOpen className="w-4 h-4" />
                  Load Template
                </button>
                <button
                  onClick={() => {
                    setEditingTemplateId(null);
                    setTemplateName('');
                    setTemplateDescription('');
                    setTemplateIsShared(false);
                    setShowSaveModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save as Template
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex items-center gap-2 mb-6 print:hidden">
          <button
            onClick={() => setActiveTab('standard')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'standard'
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border hover:bg-muted text-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
            Standard Report
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'comparison'
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border hover:bg-muted text-foreground"
            )}
          >
            <GitCompare className="w-4 h-4" />
            Period Comparison
          </button>
        </div>

        {/* Comparison Tab Content */}
        {activeTab === 'comparison' && site && (
          <ReportComparison 
            siteId={site.id}
            siteName={site.name}
            getMetricThreshold={getMetricThreshold}
          />
        )}

        {/* Standard Report Content */}
        {activeTab === 'standard' && (
          <>
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
                  activeDatePreset === preset.days
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
                onChange={(e) => handleDateChange('from', e.target.value)}
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
                onChange={(e) => handleDateChange('to', e.target.value)}
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

          {/* Custom Report Options */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-4">Report Customization (Optional)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Custom Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Wastewater Process Report"
                  className="input-field"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use default title
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes & Comments
                </label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Add any notes, observations, or comments to include in the PDF report..."
                  className="input-field min-h-[80px] resize-y"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reportNotes.length}/2000 characters
                </p>
              </div>
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
                    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 min-w-0 overflow-hidden">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        {METRICS[selectedMetric].name} Trend
                      </h3>
                      <div className="h-64 sm:h-80 min-w-0 overflow-hidden">
                        <MetricChart
                          metricId={selectedMetric}
                          readings={chartReadings}
                          threshold={chartThresholds.find(t => t.metricId === selectedMetric)}
                          containerClassName="h-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      {Object.keys(METRICS).map(metricId => {
                        const metricReadings = chartReadings.filter(r => r.metricId === metricId);
                        if (metricReadings.length === 0) return null;

                        return (
                          <div key={metricId} className="bg-card rounded-xl border border-border p-4 sm:p-6 min-w-0 overflow-hidden">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                              {METRICS[metricId as MetricType].name}
                            </h3>
                            <div className="h-64 min-w-0 overflow-hidden">
                              <MetricChart
                                metricId={metricId as MetricType}
                                readings={chartReadings}
                                threshold={chartThresholds.find(t => t.metricId === metricId)}
                                containerClassName="h-full"
                              />
                            </div>
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
          </>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingTemplateId ? 'Update Template' : 'Save as Template'}
              </h2>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Summary Report"
                  className="input-field"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  className="input-field min-h-[80px] resize-y"
                  maxLength={500}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTemplateIsShared(!templateIsShared)}
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded border transition-colors",
                    templateIsShared
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border bg-background"
                  )}
                >
                  {templateIsShared && <Check className="w-3 h-3" />}
                </button>
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share with team
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Allow other site members to use this template
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground mb-2">This template will save:</p>
                <ul className="text-foreground space-y-1">
                  <li>• Date range: {activeDatePreset ? `Last ${activeDatePreset} days` : 'Custom dates'}</li>
                  <li>• View mode: {viewMode === 'table' ? 'Table' : 'Charts'}</li>
                  {reportTitle && <li>• Title: {reportTitle}</li>}
                  {reportNotes && <li>• Notes included</li>}
                  {selectedMetric && <li>• Selected metric: {METRICS[selectedMetric].name}</li>}
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {savingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingTemplateId ? 'Update' : 'Save'} Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Load Template</h2>
              <button
                onClick={() => setShowLoadModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No templates saved yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Save your first template to quickly reuse report settings
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground truncate">{template.name}</h3>
                            {template.is_shared && (
                              <Share2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            {template.user_id !== user?.id && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">Shared</span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {template.date_range_type === 'preset' 
                                ? `Last ${template.date_range_days} days` 
                                : 'Custom dates'}
                            </span>
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {template.default_view_mode === 'table' ? 'Table' : 'Charts'}
                            </span>
                            {template.default_title && (
                              <span className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                                {template.default_title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleLoadTemplate(template)}
                            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                            title="Load template"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          {template.user_id === user?.id && (
                            <>
                              <button
                                onClick={() => handleEditTemplate(template)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                title="Edit template"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border">
              <button
                onClick={() => setShowLoadModal(false)}
                className="w-full px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
