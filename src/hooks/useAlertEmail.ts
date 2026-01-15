import { supabase } from '@/integrations/supabase/client';
import { METRICS, MetricType } from '@/types/wastewater';
import { toast } from 'sonner';

interface TriggerAlertParams {
  metricId: MetricType;
  value: number;
  thresholdMin?: number;
  thresholdMax?: number;
  siteName?: string;
  playbook?: string;
}

export function useAlertEmail() {
  const triggerAlert = async ({
    metricId,
    value,
    thresholdMin,
    thresholdMax,
    siteName = 'Main Treatment Plant',
    playbook,
  }: TriggerAlertParams) => {
    const metric = METRICS[metricId];
    
    // Determine severity
    let severity = 'warning';
    if (thresholdMin !== undefined && value < thresholdMin) {
      const deviation = thresholdMin - value;
      const range = (thresholdMax ?? thresholdMin) - thresholdMin;
      if (range > 0 && deviation > range * 0.5) {
        severity = 'critical';
      }
    } else if (thresholdMax !== undefined && value > thresholdMax) {
      const deviation = value - thresholdMax;
      const range = thresholdMax - (thresholdMin ?? thresholdMax);
      if (range > 0 && deviation > range * 0.5) {
        severity = 'critical';
      }
    }

    try {
      // Create alert event in database
      const { data: alertEvent, error: alertError } = await supabase
        .from('alert_events')
        .insert({
          metric_id: metricId,
          metric_name: metric.name,
          value,
          threshold_min: thresholdMin,
          threshold_max: thresholdMax,
          severity,
          status: 'active',
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // Send email notification via edge function
      const { error: emailError } = await supabase.functions.invoke('send-alert-email', {
        body: {
          alertEventId: alertEvent.id,
          metricName: metric.name,
          metricId,
          value,
          unit: metric.unit,
          thresholdMin,
          thresholdMax,
          severity,
          siteName,
          triggeredAt: new Date().toISOString(),
          playbook,
        },
      });

      if (emailError) {
        console.error('Error sending alert email:', emailError);
        toast.error('Alert created but email notification failed');
      } else {
        toast.success('Alert triggered and notifications sent');
      }

      return alertEvent;
    } catch (error: any) {
      console.error('Error triggering alert:', error);
      toast.error('Failed to trigger alert');
      throw error;
    }
  };

  const checkThresholds = async (
    metricId: MetricType,
    value: number,
    thresholdMin: number,
    thresholdMax: number,
    playbooks?: { condition: string; steps: string[] }[]
  ) => {
    const isViolation = value < thresholdMin || value > thresholdMax;
    
    if (!isViolation) return null;

    const condition = value < thresholdMin ? 'low' : 'high';
    const matchingPlaybook = playbooks?.find(p => p.condition === condition);
    const playbookHtml = matchingPlaybook
      ? `<ul>${matchingPlaybook.steps.map(s => `<li>${s}</li>`).join('')}</ul>`
      : undefined;

    return triggerAlert({
      metricId,
      value,
      thresholdMin,
      thresholdMax,
      playbook: playbookHtml,
    });
  };

  return { triggerAlert, checkThresholds };
}
