import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/hooks/useSite';
import { PARAMETER_LIST, ParameterKey } from '@/types/wastewater';
import { toast } from 'sonner';

export interface MetricConfig {
  id?: string;
  site_id: string;
  metric_id: ParameterKey;
  is_enabled: boolean;
  display_order: number;
}

export function useSiteMetricConfig() {
  const { site } = useSite();
  const [configs, setConfigs] = useState<MetricConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch existing configurations
  const fetchConfigs = useCallback(async () => {
    if (!site?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_metric_config')
        .select('*')
        .eq('site_id', site.id);

      if (error) throw error;

      // Merge with all parameters - if no config exists, default to enabled
      const configMap = new Map(data?.map(c => [c.metric_id, c]) || []);
      
      const mergedConfigs: MetricConfig[] = PARAMETER_LIST.map((param, index) => {
        const existing = configMap.get(param.key);
        return {
          id: existing?.id,
          site_id: site.id,
          metric_id: param.key as ParameterKey,
          is_enabled: existing?.is_enabled ?? true,
          display_order: existing?.display_order ?? index,
        };
      });

      // Sort by display_order
      mergedConfigs.sort((a, b) => a.display_order - b.display_order);
      setConfigs(mergedConfigs);
    } catch (error) {
      console.error('Error fetching metric configs:', error);
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Toggle a single metric
  const toggleMetric = (metricId: ParameterKey) => {
    setConfigs(prev => prev.map(c => 
      c.metric_id === metricId ? { ...c, is_enabled: !c.is_enabled } : c
    ));
  };

  // Set all metrics enabled/disabled
  const setAllEnabled = (enabled: boolean) => {
    setConfigs(prev => prev.map(c => ({ ...c, is_enabled: enabled })));
  };

  // Update display order
  const updateOrder = (metricId: ParameterKey, newOrder: number) => {
    setConfigs(prev => {
      const updated = prev.map(c => 
        c.metric_id === metricId ? { ...c, display_order: newOrder } : c
      );
      return updated.sort((a, b) => a.display_order - b.display_order);
    });
  };

  // Move metric up/down
  const moveMetric = (metricId: ParameterKey, direction: 'up' | 'down') => {
    setConfigs(prev => {
      const index = prev.findIndex(c => c.metric_id === metricId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newConfigs = [...prev];
      // Swap display orders
      const tempOrder = newConfigs[index].display_order;
      newConfigs[index].display_order = newConfigs[newIndex].display_order;
      newConfigs[newIndex].display_order = tempOrder;
      
      // Sort by new order
      return newConfigs.sort((a, b) => a.display_order - b.display_order);
    });
  };

  // Save all configurations
  const saveConfigs = async () => {
    if (!site?.id) return;
    
    setSaving(true);
    try {
      // Upsert all configs
      const upsertData = configs.map(c => ({
        site_id: site.id,
        metric_id: c.metric_id,
        is_enabled: c.is_enabled,
        display_order: c.display_order,
      }));

      const { error } = await supabase
        .from('site_metric_config')
        .upsert(upsertData, { 
          onConflict: 'site_id,metric_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      
      toast.success('Metric configuration saved');
      await fetchConfigs(); // Refresh to get IDs
    } catch (error: any) {
      console.error('Error saving metric configs:', error);
      toast.error('Failed to save metric configuration');
    } finally {
      setSaving(false);
    }
  };

  // Get enabled metrics only
  const enabledMetrics = configs.filter(c => c.is_enabled);
  const enabledCount = enabledMetrics.length;

  return {
    configs,
    loading,
    saving,
    toggleMetric,
    setAllEnabled,
    moveMetric,
    updateOrder,
    saveConfigs,
    enabledMetrics,
    enabledCount,
    refetch: fetchConfigs,
  };
}
