import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReminderResult {
  site: string;
  status: string;
  missingCount: number;
  missingMetrics?: string[];
  recipientCount?: number;
}

interface SendReminderResponse {
  success: boolean;
  checkDate: string;
  results: ReminderResult[];
  error?: string;
}

export function useMissingReadingsReminder() {
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendReminderResponse | null>(null);

  const sendReminder = async (siteId?: string, checkDate?: Date): Promise<SendReminderResponse | null> => {
    setSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-missing-readings-reminder', {
        body: {
          siteId,
          checkDate: checkDate?.toISOString(),
        },
      });

      if (error) throw error;

      const response = data as SendReminderResponse;
      setLastResult(response);

      // Show toast based on results
      const totalMissing = response.results.reduce((sum, r) => sum + r.missingCount, 0);
      const sitesSentTo = response.results.filter(r => r.status === 'reminders_sent').length;
      
      if (totalMissing === 0) {
        toast.success('All readings are complete! No reminders needed.');
      } else if (sitesSentTo > 0) {
        toast.success(`Reminders sent for ${sitesSentTo} site(s) with ${totalMissing} missing readings`);
      } else {
        toast.warning('Missing readings found but no recipients configured');
      }

      return response;
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminders: ' + error.message);
      return null;
    } finally {
      setSending(false);
    }
  };

  return {
    sendReminder,
    sending,
    lastResult,
  };
}
