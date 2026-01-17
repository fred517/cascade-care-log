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
  }: TriggerAlertParams) => {
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
        })
        .select()
        .single();

      if (alertError) throw alertError;

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
          playbook,
          // Include action steps from parameter definition
          actionSteps: param.actions?.[severityLevel === 'alarm' ? 'alarm' : 'watch'] || [],
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
    playbooks?: { condition: string; steps: string[] }[]
  ) => {
    const param = PARAMETERS[metricId];
    const severityLevel = getSeverity(value, param);
    
    // Only trigger if watch or alarm
    if (severityLevel === 'ok') return null;

    const condition = value < thresholdMin ? 'low' : 'high';
    
    // Use playbooks from props or fall back to parameter actions
    const matchingPlaybook = playbooks?.find(p => p.condition === condition);
    const actionSteps = matchingPlaybook?.steps || param.actions?.[severityLevel] || [];
    
    const playbookHtml = actionSteps.length > 0
      ? `<ul>${actionSteps.map(s => `<li>${s}</li>`).join('')}</ul>`
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
