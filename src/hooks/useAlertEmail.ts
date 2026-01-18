import { supabase } from '@/integrations/supabase/client';
import { PARAMETERS, ParameterKey, getSeverity } from '@/types/wastewater';
import { toast } from 'sonner';

interface TriggerAlertParams {
  metricId: ParameterKey;
  value: number;
  thresholdMin?: number;
  thresholdMax?: number;
  siteName?: string;
  siteId?: string;
  playbook?: string;
  playbookSteps?: string[];
}

interface AlertEvent {
  id: string;
  metric_id: string;
  metric_name: string;
  value: number;
  threshold_min: number | null;
  threshold_max: number | null;
  severity: string;
  status: string;
  triggered_at: string;
  site_id: string | null;
}

export function useAlertEmail() {
  const triggerAlert = async ({
    metricId,
    value,
    thresholdMin,
    thresholdMax,
    siteName = 'Main Treatment Plant',
    siteId,
    playbook,
    playbookSteps,
  }: TriggerAlertParams): Promise<AlertEvent | null> => {
    const param = PARAMETERS[metricId];
    
    // Use the new severity system
    const severityLevel = getSeverity(value, param);
    const severity = severityLevel === 'alarm' ? 'critical' : severityLevel === 'watch' ? 'warning' : 'info';

    try {
      // Create alert event in database
      const { data: alertEvent, error: alertError } = await supabase
        .from('alert_events')
        .insert({
          metric_id: metricId,
          metric_name: param.label,
          value,
          threshold_min: thresholdMin,
          threshold_max: thresholdMax,
          severity,
          status: 'active',
          site_id: siteId,
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // Prepare action steps - use provided playbook steps or fall back to parameter defaults
      const actionSteps = playbookSteps || param.actions?.[severityLevel === 'alarm' ? 'alarm' : 'watch'] || [];

      // Send email notification via edge function
      const { error: emailError } = await supabase.functions.invoke('send-alert-email', {
        body: {
          alertEventId: alertEvent.id,
          metricName: param.label,
          metricId,
          value,
          unit: param.unit,
          thresholdMin,
          thresholdMax,
          severity,
          siteName,
          siteId,
          triggeredAt: new Date().toISOString(),
          playbook: playbook || (actionSteps.length > 0 
            ? `<ul>${actionSteps.map(s => `<li>${s}</li>`).join('')}</ul>` 
            : undefined),
          actionSteps,
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
    metricId: ParameterKey,
    value: number,
    thresholdMin: number,
    thresholdMax: number,
    siteId?: string,
    playbookSteps?: string[]
  ): Promise<AlertEvent | null> => {
    const param = PARAMETERS[metricId];
    const severityLevel = getSeverity(value, param);
    
    // Only trigger if watch or alarm
    if (severityLevel === 'ok') return null;

    const condition = value < thresholdMin ? 'low' : 'high';
    
    // Try to get site-specific playbook steps
    let steps = playbookSteps;
    
    if (!steps && siteId) {
      // Fetch playbook from database
      const { data: sitePlaybook } = await supabase
        .from('site_playbooks')
        .select('steps')
        .eq('site_id', siteId)
        .eq('metric_id', metricId)
        .eq('condition', condition)
        .eq('is_active', true)
        .maybeSingle();
      
      if (sitePlaybook?.steps) {
        steps = sitePlaybook.steps;
      }
    }
    
    // Fall back to parameter defaults
    if (!steps) {
      steps = param.actions?.[severityLevel] || [];
    }

    return triggerAlert({
      metricId,
      value,
      thresholdMin,
      thresholdMax,
      siteId,
      playbookSteps: steps,
    });
  };

  return { triggerAlert, checkThresholds };
}
