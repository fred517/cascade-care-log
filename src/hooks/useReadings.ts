import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSite } from './useSite';
import { MetricType, METRICS } from '@/types/wastewater';
import { toast } from 'sonner';

interface Reading {
  id: string;
  site_id: string;
  metric_id: string;
  value: number;
  notes: string | null;
  entered_by: string;
  recorded_at: string;
  created_at: string;
}

interface Threshold {
  id: string;
  site_id: string;
  metric_id: string;
  min_value: number;
  max_value: number;
  enabled: boolean;
}

export function useReadings() {
  const { user } = useAuth();
  const { site } = useSite();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadings = useCallback(async (days = 30) => {
    if (!site) return;

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('site_id', site.id)
        .gte('recorded_at', fromDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error('Error fetching readings:', error);
    }
  }, [site]);

  const fetchThresholds = useCallback(async () => {
    if (!site) return;

    try {
      const { data, error } = await supabase
        .from('thresholds')
        .select('*')
        .eq('site_id', site.id);

      if (error) throw error;
      setThresholds(data || []);
    } catch (error) {
      console.error('Error fetching thresholds:', error);
    }
  }, [site]);

  useEffect(() => {
    if (user && site) {
      setLoading(true);
      Promise.all([fetchReadings(), fetchThresholds()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, site, fetchReadings, fetchThresholds]);

  const addReading = async (
    metricId: MetricType,
    value: number,
    notes?: string,
    recordedAt?: Date
  ) => {
    if (!site || !user) {
      toast.error('No site or user available');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('readings')
        .insert({
          site_id: site.id,
          metric_id: metricId,
          value,
          notes,
          entered_by: user.id,
          recorded_at: (recordedAt || new Date()).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setReadings(prev => [data, ...prev]);
      return data;
    } catch (error: any) {
      console.error('Error adding reading:', error);
      toast.error('Failed to save reading');
      return null;
    }
  };

  const addMultipleReadings = async (
    readingsData: { metricId: MetricType; value: number; notes?: string }[],
    recordedAt?: Date
  ) => {
    if (!site || !user) {
      toast.error('No site or user available');
      return [];
    }

    const timestamp = (recordedAt || new Date()).toISOString();
    const insertData = readingsData.map(r => ({
      site_id: site.id,
      metric_id: r.metricId,
      value: r.value,
      notes: r.notes || null,
      entered_by: user.id,
      recorded_at: timestamp,
    }));

    try {
      const { data, error } = await supabase
        .from('readings')
        .insert(insertData)
        .select();

      if (error) throw error;

      setReadings(prev => [...(data || []), ...prev]);
      return data || [];
    } catch (error: any) {
      console.error('Error adding readings:', error);
      toast.error('Failed to save readings');
      return [];
    }
  };

  // Get readings for a specific date
  const getReadingsForDate = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return readings.filter(r => {
      const readingDate = new Date(r.recorded_at);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === targetDate.getTime();
    });
  };

  const updateThreshold = async (
    metricId: string,
    minValue: number,
    maxValue: number,
    enabled = true
  ) => {
    if (!site) {
      toast.error('No site available');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('thresholds')
        .upsert({
          site_id: site.id,
          metric_id: metricId,
          min_value: minValue,
          max_value: maxValue,
          enabled,
        }, {
          onConflict: 'site_id,metric_id',
        })
        .select()
        .single();

      if (error) throw error;

      setThresholds(prev => {
        const existing = prev.findIndex(t => t.metric_id === metricId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });

      toast.success('Threshold updated');
      return data;
    } catch (error: any) {
      console.error('Error updating threshold:', error);
      toast.error('Failed to update threshold');
      return null;
    }
  };

  // Get readings for a specific metric
  const getMetricReadings = (metricId: MetricType) => {
    return readings.filter(r => r.metric_id === metricId);
  };

  // Get threshold for a specific metric
  const getMetricThreshold = (metricId: MetricType): Threshold | null => {
    const threshold = thresholds.find(t => t.metric_id === metricId);
    if (threshold) return threshold;
    
    // Return default if not found
    const metric = METRICS[metricId];
    return {
      id: '',
      site_id: site?.id || '',
      metric_id: metricId,
      min_value: metric.defaultMin,
      max_value: metric.defaultMax,
      enabled: true,
    };
  };

  // Get today's readings
  const getTodayReadings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return readings.filter(r => {
      const readingDate = new Date(r.recorded_at);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });
  };

  return {
    readings,
    thresholds,
    loading,
    addReading,
    addMultipleReadings,
    updateThreshold,
    getMetricReadings,
    getMetricThreshold,
    getTodayReadings,
    getReadingsForDate,
    refetch: () => Promise.all([fetchReadings(), fetchThresholds()]),
  };
}
