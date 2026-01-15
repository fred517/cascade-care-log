import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { METRICS, MetricType } from '@/types/wastewater';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Loader2,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileDown,
  MessageSquarePlus,
  AlertTriangle,
  Info,
  AlertCircle,
  X,
  Check,
  Trash2,
  Edit2,
  CheckCircle
} from 'lucide-react';
import { 
  format, 
  subWeeks, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfDay,
  endOfDay,
  addWeeks,
  addMonths,
  isSameWeek,
  isSameMonth
} from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type ComparisonType = 'week' | 'month';

interface ComparisonPeriod {
  label: string;
  from: Date;
  to: Date;
}

interface MetricComparisonStats {
  current: {
    count: number;
    min: number;
    max: number;
    avg: number;
    outOfRange: number;
  };
  previous: {
    count: number;
    min: number;
    max: number;
    avg: number;
    outOfRange: number;
  };
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

type AnnotationSeverity = 'info' | 'warning' | 'critical';

interface Annotation {
  id: string;
  site_id: string;
  user_id: string;
  metric_id: string;
  comparison_type: string;
  period_start: string;
  period_end: string;
  note: string;
  severity: AnnotationSeverity;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ReportComparisonProps {
  siteId: string;
  siteName?: string;
  getMetricThreshold: (metricId: MetricType) => { min_value: number; max_value: number } | undefined;
}

export function ReportComparison({ siteId, siteName, getMetricThreshold }: ReportComparisonProps) {
  const { user } = useAuth();
  const [comparisonType, setComparisonType] = useState<ComparisonType>('week');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [currentReadings, setCurrentReadings] = useState<any[]>([]);
  const [previousReadings, setPreviousReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [selectedMetricForAnnotation, setSelectedMetricForAnnotation] = useState<string | null>(null);
  const [annotationNote, setAnnotationNote] = useState('');
  const [annotationSeverity, setAnnotationSeverity] = useState<AnnotationSeverity>('info');
  const [savingAnnotation, setSavingAnnotation] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);

  // Calculate comparison periods
  const periods = useMemo((): { current: ComparisonPeriod; previous: ComparisonPeriod } => {
    if (comparisonType === 'week') {
      const currentStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const currentEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
      const previousStart = startOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 });
      const previousEnd = endOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 });

      return {
        current: {
          label: isSameWeek(currentStart, new Date(), { weekStartsOn: 1 }) 
            ? 'This Week' 
            : format(currentStart, 'MMM d') + ' - ' + format(currentEnd, 'MMM d'),
          from: currentStart,
          to: currentEnd,
        },
        previous: {
          label: 'Previous Week',
          from: previousStart,
          to: previousEnd,
        },
      };
    } else {
      const currentStart = startOfMonth(referenceDate);
      const currentEnd = endOfMonth(referenceDate);
      const previousStart = startOfMonth(subMonths(referenceDate, 1));
      const previousEnd = endOfMonth(subMonths(referenceDate, 1));

      return {
        current: {
          label: isSameMonth(currentStart, new Date()) 
            ? 'This Month' 
            : format(currentStart, 'MMMM yyyy'),
          from: currentStart,
          to: currentEnd,
        },
        previous: {
          label: format(previousStart, 'MMMM yyyy'),
          from: previousStart,
          to: previousEnd,
        },
      };
    }
  }, [comparisonType, referenceDate]);

  // Navigate periods
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (comparisonType === 'week') {
      setReferenceDate(prev => 
        direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      );
    } else {
      setReferenceDate(prev => 
        direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
      );
    }
  };

  // Fetch annotations for the current period
  const fetchAnnotations = async () => {
    if (!siteId || !user) return;

    setLoadingAnnotations(true);
    try {
      const { data, error } = await supabase
        .from('comparison_annotations')
        .select('*')
        .eq('site_id', siteId)
        .eq('comparison_type', comparisonType)
        .eq('period_start', format(periods.current.from, 'yyyy-MM-dd'))
        .eq('period_end', format(periods.current.to, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnotations((data || []) as Annotation[]);
    } catch (error) {
      console.error('Error fetching annotations:', error);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  // Fetch annotations when periods change
  useEffect(() => {
    if (hasData && user) {
      fetchAnnotations();
    }
  }, [hasData, periods.current.from, periods.current.to, comparisonType, user]);

  // Save annotation
  const handleSaveAnnotation = async () => {
    if (!user || !selectedMetricForAnnotation || !annotationNote.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSavingAnnotation(true);
    try {
      if (editingAnnotation) {
        const { error } = await supabase
          .from('comparison_annotations')
          .update({
            note: annotationNote.trim(),
            severity: annotationSeverity,
          })
          .eq('id', editingAnnotation.id);

        if (error) throw error;
        toast.success('Annotation updated');
      } else {
        const { error } = await supabase
          .from('comparison_annotations')
          .insert({
            site_id: siteId,
            user_id: user.id,
            metric_id: selectedMetricForAnnotation,
            comparison_type: comparisonType,
            period_start: format(periods.current.from, 'yyyy-MM-dd'),
            period_end: format(periods.current.to, 'yyyy-MM-dd'),
            note: annotationNote.trim(),
            severity: annotationSeverity,
          });

        if (error) throw error;
        toast.success('Annotation added');
      }

      setShowAnnotationModal(false);
      setAnnotationNote('');
      setAnnotationSeverity('info');
      setSelectedMetricForAnnotation(null);
      setEditingAnnotation(null);
      fetchAnnotations();
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Failed to save annotation');
    } finally {
      setSavingAnnotation(false);
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from('comparison_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;
      
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      toast.success('Annotation deleted');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Failed to delete annotation');
    }
  };

  // Resolve annotation
  const handleResolveAnnotation = async (annotation: Annotation) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comparison_annotations')
        .update({
          is_resolved: !annotation.is_resolved,
          resolved_at: annotation.is_resolved ? null : new Date().toISOString(),
          resolved_by: annotation.is_resolved ? null : user.id,
        })
        .eq('id', annotation.id);

      if (error) throw error;
      
      fetchAnnotations();
      toast.success(annotation.is_resolved ? 'Annotation reopened' : 'Annotation resolved');
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast.error('Failed to update annotation');
    }
  };

  // Open annotation modal for a metric
  const openAnnotationModal = (metricId: string, annotation?: Annotation) => {
    setSelectedMetricForAnnotation(metricId);
    if (annotation) {
      setEditingAnnotation(annotation);
      setAnnotationNote(annotation.note);
      setAnnotationSeverity(annotation.severity as AnnotationSeverity);
    } else {
      setEditingAnnotation(null);
      setAnnotationNote('');
      setAnnotationSeverity('info');
    }
    setShowAnnotationModal(true);
  };

  // Get annotations for a specific metric
  const getMetricAnnotations = (metricId: string) => {
    return annotations.filter(a => a.metric_id === metricId);
  };

  // Severity icon and color helpers
  const getSeverityIcon = (severity: AnnotationSeverity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: AnnotationSeverity) => {
    switch (severity) {
      case 'critical': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'warning': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
      default: return 'text-status-info bg-status-info/10 border-status-info/20';
    }
  };

  // Fetch comparison data
  const fetchComparisonData = async () => {
    if (!siteId) return;

    setLoading(true);
    try {
      // Fetch current period
      const { data: current, error: currentError } = await supabase
        .from('readings')
        .select('*')
        .eq('site_id', siteId)
        .gte('recorded_at', startOfDay(periods.current.from).toISOString())
        .lte('recorded_at', endOfDay(periods.current.to).toISOString())
        .order('recorded_at', { ascending: false });

      if (currentError) throw currentError;

      // Fetch previous period
      const { data: previous, error: previousError } = await supabase
        .from('readings')
        .select('*')
        .eq('site_id', siteId)
        .gte('recorded_at', startOfDay(periods.previous.from).toISOString())
        .lte('recorded_at', endOfDay(periods.previous.to).toISOString())
        .order('recorded_at', { ascending: false });

      if (previousError) throw previousError;

      setCurrentReadings(current || []);
      setPreviousReadings(previous || []);
      setHasData(true);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      toast.error('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate comparison statistics
  const comparisonStats = useMemo(() => {
    const stats: Record<MetricType, MetricComparisonStats> = {} as any;

    Object.keys(METRICS).forEach(metricId => {
      const currentMetricReadings = currentReadings.filter(r => r.metric_id === metricId);
      const previousMetricReadings = previousReadings.filter(r => r.metric_id === metricId);
      const threshold = getMetricThreshold(metricId as MetricType);

      const calcStats = (readings: any[]) => {
        if (readings.length === 0) {
          return { count: 0, min: 0, max: 0, avg: 0, outOfRange: 0 };
        }
        const values = readings.map(r => Number(r.value));
        const outOfRange = threshold
          ? values.filter(v => v < threshold.min_value || v > threshold.max_value).length
          : 0;
        return {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          outOfRange,
        };
      };

      const current = calcStats(currentMetricReadings);
      const previous = calcStats(previousMetricReadings);
      const change = current.avg - previous.avg;
      const changePercent = previous.avg !== 0 ? (change / previous.avg) * 100 : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(changePercent) > 5) {
        trend = change > 0 ? 'up' : 'down';
      }

      stats[metricId as MetricType] = {
        current,
        previous,
        change,
        changePercent,
        trend,
      };
    });

    return stats;
  }, [currentReadings, previousReadings, getMetricThreshold]);

  // Chart data
  const chartData = useMemo(() => {
    return Object.entries(METRICS).map(([id, metric]) => {
      const stats = comparisonStats[id as MetricType];
      return {
        name: metric.name,
        metricId: id,
        current: stats?.current.avg || 0,
        previous: stats?.previous.avg || 0,
        change: stats?.changePercent || 0,
        unit: metric.unit,
        precision: metric.precision,
      };
    }).filter(d => d.current > 0 || d.previous > 0);
  }, [comparisonStats]);

  const hasAnyData = currentReadings.length > 0 || previousReadings.length > 0;

  // Export comparison to PDF
  const exportComparisonToPDF = async () => {
    if (!hasAnyData) {
      toast.error('No data to export');
      return;
    }

    setExportingPDF(true);
    toast.info('Generating comparison PDF...');

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
      pdf.text(`${comparisonType === 'week' ? 'Week-to-Week' : 'Month-to-Month'} Comparison Report`, margin, yPosition);
      yPosition += 10;

      // Site info
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      if (siteName) {
        pdf.text(`Site: ${siteName}`, margin, yPosition);
        yPosition += 6;
      }
      pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, margin, yPosition);
      yPosition += 10;

      // Period comparison header
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text('Comparison Periods', margin, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(`Previous: ${periods.previous.label} (${format(periods.previous.from, 'MMM d')} - ${format(periods.previous.to, 'MMM d, yyyy')})`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Current: ${periods.current.label} (${format(periods.current.from, 'MMM d')} - ${format(periods.current.to, 'MMM d, yyyy')})`, margin, yPosition);
      yPosition += 10;

      // Divider
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Summary Statistics Table
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text('Comparison Statistics', margin, yPosition);
      yPosition += 8;

      // Table header
      const colWidths = [30, 20, 25, 25, 20, 25, 25, 20];
      const headers = ['Metric', 'Cnt', 'Prev Avg', 'Prev Range', 'Cnt', 'Curr Avg', 'Curr Range', 'Change'];
      
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 4, contentWidth, 8, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      
      let xPos = margin + 1;
      headers.forEach((header, idx) => {
        pdf.text(header, xPos, yPosition);
        xPos += colWidths[idx];
      });
      yPosition += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);

      Object.entries(METRICS).forEach(([id, metric], index) => {
        const stats = comparisonStats[id as MetricType];
        if (!stats || (stats.current.count === 0 && stats.previous.count === 0)) return;

        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition - 3, contentWidth, 6, 'F');
        }

        xPos = margin + 1;
        pdf.setTextColor(33, 33, 33);
        
        // Metric name
        pdf.text(metric.name, xPos, yPosition);
        xPos += colWidths[0];
        
        // Previous count
        pdf.text(stats.previous.count.toString(), xPos, yPosition);
        xPos += colWidths[1];
        
        // Previous avg
        pdf.text(stats.previous.count > 0 ? `${stats.previous.avg.toFixed(metric.precision)} ${metric.unit}` : '-', xPos, yPosition);
        xPos += colWidths[2];
        
        // Previous range
        pdf.text(stats.previous.count > 0 ? `${stats.previous.min.toFixed(metric.precision)}-${stats.previous.max.toFixed(metric.precision)}` : '-', xPos, yPosition);
        xPos += colWidths[3];
        
        // Current count
        pdf.text(stats.current.count.toString(), xPos, yPosition);
        xPos += colWidths[4];
        
        // Current avg
        pdf.setFont('helvetica', 'bold');
        pdf.text(stats.current.count > 0 ? `${stats.current.avg.toFixed(metric.precision)} ${metric.unit}` : '-', xPos, yPosition);
        pdf.setFont('helvetica', 'normal');
        xPos += colWidths[5];
        
        // Current range
        pdf.text(stats.current.count > 0 ? `${stats.current.min.toFixed(metric.precision)}-${stats.current.max.toFixed(metric.precision)}` : '-', xPos, yPosition);
        xPos += colWidths[6];
        
        // Change percent
        if (stats.current.count > 0 && stats.previous.count > 0) {
          const changeText = `${stats.changePercent > 0 ? '+' : ''}${stats.changePercent.toFixed(1)}%`;
          if (stats.changePercent > 5) {
            pdf.setTextColor(200, 100, 0);
          } else if (stats.changePercent < -5) {
            pdf.setTextColor(50, 150, 200);
          } else {
            pdf.setTextColor(100, 100, 100);
          }
          pdf.text(changeText, xPos, yPosition);
          pdf.setTextColor(33, 33, 33);
        } else {
          pdf.text('-', xPos, yPosition);
        }
        
        yPosition += 6;
      });

      yPosition += 10;

      // Capture chart if available
      if (chartRef.current) {
        try {
          if (yPosition > pageHeight - 80) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(33, 33, 33);
          pdf.text('Comparison Chart', margin, yPosition);
          yPosition += 8;

          const canvas = await html2canvas(chartRef.current, {
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

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - margin));
          yPosition += imgHeight + 10;
        } catch (err) {
          console.error('Error capturing chart:', err);
        }
      }

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
          'Wastewater Process Tracker - Comparison Report',
          margin,
          pageHeight - 8
        );
      }

      // Save PDF
      const periodLabel = comparisonType === 'week' ? 'weekly' : 'monthly';
      const filename = `comparison-report-${periodLabel}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);

      toast.success('Comparison PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate comparison PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Comparison Type Selection */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Period Comparison
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setComparisonType('week');
                setReferenceDate(new Date());
                setHasData(false);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                comparisonType === 'week'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              Week to Week
            </button>
            <button
              onClick={() => {
                setComparisonType('month');
                setReferenceDate(new Date());
                setHasData(false);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                comparisonType === 'month'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              Month to Month
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
              disabled={
                (comparisonType === 'week' && isSameWeek(referenceDate, new Date(), { weekStartsOn: 1 })) ||
                (comparisonType === 'month' && isSameMonth(referenceDate, new Date()))
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{periods.previous.label}</span>
                <span className="text-muted-foreground">
                  ({format(periods.previous.from, 'MMM d')} - {format(periods.previous.to, 'MMM d')})
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary">{periods.current.label}</span>
                <span className="text-muted-foreground">
                  ({format(periods.current.from, 'MMM d')} - {format(periods.current.to, 'MMM d')})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchComparisonData}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Compare Periods
                </>
              )}
            </button>
            {hasData && hasAnyData && (
              <button
                onClick={exportComparisonToPDF}
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
            )}
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {hasData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(METRICS).map(([id, metric]) => {
              const stats = comparisonStats[id as MetricType];
              if (!stats || (stats.current.count === 0 && stats.previous.count === 0)) return null;
              const metricAnnotations = getMetricAnnotations(id);
              const hasUnresolvedAnnotations = metricAnnotations.some(a => !a.is_resolved);

              return (
                <div
                  key={id}
                  className={cn(
                    "bg-card rounded-xl border p-4 relative",
                    hasUnresolvedAnnotations ? "border-status-warning" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{metric.name}</span>
                    <div className="flex items-center gap-1">
                      {metricAnnotations.length > 0 && (
                        <span className={cn(
                          "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold",
                          hasUnresolvedAnnotations 
                            ? "bg-status-warning/20 text-status-warning" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {metricAnnotations.length}
                        </span>
                      )}
                      {stats.trend === 'up' && <TrendingUp className="w-4 h-4 text-status-warning" />}
                      {stats.trend === 'down' && <TrendingDown className="w-4 h-4 text-status-info" />}
                      {stats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Current:</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {stats.current.count > 0 ? stats.current.avg.toFixed(metric.precision) : '-'}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{metric.unit}</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Previous:</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {stats.previous.count > 0 ? stats.previous.avg.toFixed(metric.precision) : '-'}
                        <span className="text-xs ml-1">{metric.unit}</span>
                      </span>
                    </div>
                  </div>

                  {stats.current.count > 0 && stats.previous.count > 0 && (
                    <div className={cn(
                      "mt-3 pt-3 border-t border-border text-center",
                    )}>
                      <span className={cn(
                        "text-sm font-semibold",
                        stats.changePercent > 5 ? "text-status-warning" :
                        stats.changePercent < -5 ? "text-status-info" :
                        "text-muted-foreground"
                      )}>
                        {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.current.count} vs {stats.previous.count} readings
                      </p>
                    </div>
                  )}

                  {/* Add annotation button */}
                  <button
                    onClick={() => openAnnotationModal(id)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    title="Add annotation"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Annotations Section */}
          {annotations.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-primary" />
                  Annotations & Notes
                </h3>
                <span className="text-sm text-muted-foreground">
                  {annotations.filter(a => !a.is_resolved).length} open, {annotations.filter(a => a.is_resolved).length} resolved
                </span>
              </div>
              <div className="space-y-3">
                {annotations.map(annotation => {
                  const metric = METRICS[annotation.metric_id as MetricType];
                  return (
                    <div 
                      key={annotation.id} 
                      className={cn(
                        "p-4 rounded-lg border",
                        annotation.is_resolved 
                          ? "bg-muted/30 border-border opacity-70" 
                          : getSeverityColor(annotation.severity as AnnotationSeverity)
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "mt-0.5",
                            annotation.is_resolved ? "text-muted-foreground" : ""
                          )}>
                            {annotation.is_resolved 
                              ? <CheckCircle className="w-4 h-4 text-status-normal" />
                              : getSeverityIcon(annotation.severity as AnnotationSeverity)
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "font-medium",
                                annotation.is_resolved ? "text-muted-foreground line-through" : "text-foreground"
                              )}>
                                {metric?.name || annotation.metric_id}
                              </span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                annotation.is_resolved 
                                  ? "bg-muted text-muted-foreground" 
                                  : annotation.severity === 'critical' 
                                    ? "bg-destructive/20 text-destructive"
                                    : annotation.severity === 'warning'
                                      ? "bg-status-warning/20 text-status-warning"
                                      : "bg-status-info/20 text-status-info"
                              )}>
                                {annotation.severity}
                              </span>
                              {annotation.is_resolved && (
                                <span className="text-xs text-status-normal">Resolved</span>
                              )}
                            </div>
                            <p className={cn(
                              "text-sm",
                              annotation.is_resolved ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {annotation.note}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Added {format(new Date(annotation.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleResolveAnnotation(annotation)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              annotation.is_resolved 
                                ? "hover:bg-muted text-muted-foreground" 
                                : "hover:bg-status-normal/20 text-status-normal"
                            )}
                            title={annotation.is_resolved ? "Reopen" : "Mark as resolved"}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openAnnotationModal(annotation.metric_id, annotation)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnotation(annotation.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Annotation Button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                const firstMetric = Object.keys(METRICS)[0];
                if (firstMetric) openAnnotationModal(firstMetric);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Add Annotation
            </button>
          </div>

          {/* Comparison Chart */}
          {chartData.length > 0 && (
            <div ref={chartRef} className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Average Values Comparison
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        const item = props.payload;
                        return [
                          `${value.toFixed(item.precision)} ${item.unit}`,
                          name === 'previous' ? periods.previous.label : periods.current.label
                        ];
                      }}
                    />
                    <Legend 
                      verticalAlign="top"
                      formatter={(value) => value === 'previous' ? periods.previous.label : periods.current.label}
                    />
                    <Bar dataKey="previous" fill="hsl(var(--muted-foreground))" name="previous" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" fill="hsl(var(--primary))" name="current" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Comparison Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Detailed Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Metric</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground" colSpan={3}>
                      {periods.previous.label}
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground" colSpan={3}>
                      {periods.current.label}
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Change</th>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground"></th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Count</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Avg</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Range</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Count</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Avg</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Range</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(METRICS).map(([id, metric], index) => {
                    const stats = comparisonStats[id as MetricType];
                    if (!stats || (stats.current.count === 0 && stats.previous.count === 0)) return null;

                    return (
                      <tr 
                        key={id}
                        className={cn(
                          "border-b border-border last:border-0",
                          index % 2 === 0 ? "bg-card" : "bg-muted/20"
                        )}
                      >
                        <td className="p-4">
                          <span className="font-medium text-foreground">{metric.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({metric.unit})</span>
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.previous.count || '-'}
                        </td>
                        <td className="p-4 text-center font-mono">
                          {stats.previous.count > 0 ? stats.previous.avg.toFixed(metric.precision) : '-'}
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.previous.count > 0 
                            ? `${stats.previous.min.toFixed(metric.precision)} - ${stats.previous.max.toFixed(metric.precision)}`
                            : '-'}
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.current.count || '-'}
                        </td>
                        <td className="p-4 text-center font-mono font-semibold">
                          {stats.current.count > 0 ? stats.current.avg.toFixed(metric.precision) : '-'}
                        </td>
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {stats.current.count > 0 
                            ? `${stats.current.min.toFixed(metric.precision)} - ${stats.current.max.toFixed(metric.precision)}`
                            : '-'}
                        </td>
                        <td className="p-4 text-center">
                          {stats.current.count > 0 && stats.previous.count > 0 ? (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                              stats.changePercent > 5 ? "bg-status-warning/20 text-status-warning" :
                              stats.changePercent < -5 ? "bg-status-info/20 text-status-info" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {stats.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                              {stats.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                              {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!hasData && !loading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Comparison Data</h3>
          <p className="text-muted-foreground mb-4">
            Select a comparison type and click "Compare Periods" to view the comparison.
          </p>
        </div>
      )}

      {/* No Data for Periods */}
      {hasData && !hasAnyData && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Readings Found</h3>
          <p className="text-muted-foreground">
            No readings were found for the selected periods. Try selecting a different time range.
          </p>
        </div>
      )}

      {/* Annotation Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingAnnotation ? 'Edit Annotation' : 'Add Annotation'}
              </h2>
              <button
                onClick={() => {
                  setShowAnnotationModal(false);
                  setEditingAnnotation(null);
                  setAnnotationNote('');
                  setAnnotationSeverity('info');
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Metric selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Metric
                </label>
                <select
                  value={selectedMetricForAnnotation || ''}
                  onChange={(e) => setSelectedMetricForAnnotation(e.target.value)}
                  className="input-field"
                  disabled={!!editingAnnotation}
                >
                  <option value="">Select a metric...</option>
                  {Object.entries(METRICS).map(([id, metric]) => (
                    <option key={id} value={id}>{metric.name}</option>
                  ))}
                </select>
              </div>

              {/* Severity selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Severity
                </label>
                <div className="flex items-center gap-2">
                  {(['info', 'warning', 'critical'] as AnnotationSeverity[]).map(severity => (
                    <button
                      key={severity}
                      type="button"
                      onClick={() => setAnnotationSeverity(severity)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1",
                        annotationSeverity === severity
                          ? severity === 'critical' 
                            ? "bg-destructive text-destructive-foreground"
                            : severity === 'warning'
                              ? "bg-status-warning text-white"
                              : "bg-status-info text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      )}
                    >
                      {severity === 'critical' && <AlertCircle className="w-4 h-4" />}
                      {severity === 'warning' && <AlertTriangle className="w-4 h-4" />}
                      {severity === 'info' && <Info className="w-4 h-4" />}
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note textarea */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Note *
                </label>
                <textarea
                  value={annotationNote}
                  onChange={(e) => setAnnotationNote(e.target.value)}
                  placeholder="Describe the anomaly or observation..."
                  className="input-field min-h-[100px] resize-y"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {annotationNote.length}/1000 characters
                </p>
              </div>

              {/* Period info */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  This annotation will be linked to:
                </p>
                <p className="font-medium text-foreground mt-1">
                  {periods.current.label} ({format(periods.current.from, 'MMM d')} - {format(periods.current.to, 'MMM d, yyyy')})
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowAnnotationModal(false);
                  setEditingAnnotation(null);
                  setAnnotationNote('');
                  setAnnotationSeverity('info');
                }}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                disabled={savingAnnotation || !annotationNote.trim() || !selectedMetricForAnnotation}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {savingAnnotation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingAnnotation ? 'Update' : 'Save'} Annotation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
