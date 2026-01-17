import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';
import { useAuth } from './useAuth';

export interface CalibrationSchedule {
  id: string;
  site_id: string;
  meter_name: string;
  meter_type: string;
  interval_days: number;
  last_calibration_at: string | null;
  next_due_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalibrationLog {
  id: string;
  schedule_id: string;
  calibrated_by: string;
  calibrated_at: string;
  pre_cal_reading: number | null;
  post_cal_reading: number | null;
  reference_value: number | null;
  deviation_percent: number | null;
  passed: boolean;
  notes: string | null;
  created_at: string;
}

export const METER_TYPES = [
  { value: 'mlss', label: 'MLSS/TSS Sensor' },
  { value: 'do', label: 'Dissolved Oxygen' },
  { value: 'ph', label: 'pH Probe' },
  { value: 'orp', label: 'ORP Sensor' },
  { value: 'ammonia', label: 'Ammonia Analyzer' },
  { value: 'nitrate', label: 'Nitrate Analyzer' },
  { value: 'turbidity', label: 'Turbidity Meter' },
  { value: 'flow', label: 'Flow Meter' },
  { value: 'level', label: 'Level Sensor' },
  { value: 'general', label: 'General/Other' },
];

export function useCalibrationSchedules() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['calibration-schedules', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];

      const { data, error } = await supabase
        .from('calibration_schedules')
        .select('*')
        .eq('site_id', site.id)
        .eq('is_active', true)
        .order('next_due_at', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as CalibrationSchedule[];
    },
    enabled: !!site?.id,
  });
}

export function useDueCalibrations() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['calibrations-due', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('calibration_schedules')
        .select('*')
        .eq('site_id', site.id)
        .eq('is_active', true)
        .lte('next_due_at', tomorrow.toISOString())
        .order('next_due_at', { ascending: true });

      if (error) throw error;
      return data as CalibrationSchedule[];
    },
    enabled: !!site?.id,
  });
}

export function useCalibrationLogs(scheduleId: string | null) {
  return useQuery({
    queryKey: ['calibration-logs', scheduleId],
    queryFn: async () => {
      if (!scheduleId) return [];

      const { data, error } = await supabase
        .from('calibration_logs')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('calibrated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CalibrationLog[];
    },
    enabled: !!scheduleId,
  });
}

export function useCreateCalibrationSchedule() {
  const queryClient = useQueryClient();
  const { site } = useSite();

  return useMutation({
    mutationFn: async (schedule: {
      meter_name: string;
      meter_type: string;
      interval_days?: number;
      assigned_to?: string;
      notes?: string;
    }) => {
      if (!site?.id) throw new Error('No site selected');

      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + (schedule.interval_days || 7));

      const { data, error } = await supabase
        .from('calibration_schedules')
        .insert({
          site_id: site.id,
          meter_name: schedule.meter_name,
          meter_type: schedule.meter_type,
          interval_days: schedule.interval_days || 7,
          assigned_to: schedule.assigned_to,
          notes: schedule.notes,
          next_due_at: nextDue.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calibrations-due'] });
    },
  });
}

export function useRecordCalibration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (calibration: {
      schedule_id: string;
      pre_cal_reading?: number;
      post_cal_reading?: number;
      reference_value?: number;
      deviation_percent?: number;
      passed?: boolean;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get the schedule to calculate next due date
      const { data: schedule, error: scheduleError } = await supabase
        .from('calibration_schedules')
        .select('interval_days')
        .eq('id', calibration.schedule_id)
        .single();

      if (scheduleError) throw scheduleError;

      const now = new Date();
      const nextDue = new Date(now);
      nextDue.setDate(nextDue.getDate() + (schedule.interval_days || 7));

      // Insert log entry
      const { error: logError } = await supabase
        .from('calibration_logs')
        .insert({
          schedule_id: calibration.schedule_id,
          calibrated_by: user.id,
          calibrated_at: now.toISOString(),
          pre_cal_reading: calibration.pre_cal_reading,
          post_cal_reading: calibration.post_cal_reading,
          reference_value: calibration.reference_value,
          deviation_percent: calibration.deviation_percent,
          passed: calibration.passed ?? true,
          notes: calibration.notes,
        });

      if (logError) throw logError;

      // Update schedule with next due date
      const { error: updateError } = await supabase
        .from('calibration_schedules')
        .update({
          last_calibration_at: now.toISOString(),
          next_due_at: nextDue.toISOString(),
        })
        .eq('id', calibration.schedule_id);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calibrations-due'] });
      queryClient.invalidateQueries({ queryKey: ['calibration-logs'] });
    },
  });
}

export function useDeleteCalibrationSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calibration_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibration-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['calibrations-due'] });
    },
  });
}
