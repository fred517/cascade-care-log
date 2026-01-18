import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from '@/hooks/useSite';
import { ParameterKey, PARAMETERS } from '@/types/wastewater';
import { generateDefaultPlaybooks, DefaultPlaybook } from '@/lib/defaultPlaybooks';
import { toast } from 'sonner';

export interface SitePlaybook {
  id: string;
  siteId: string;
  metricId: ParameterKey;
  condition: 'low' | 'high';
  title: string;
  steps: string[];
  referenceLinks: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function usePlaybooks() {
  const { site, loading: siteLoading } = useSite();
  const [playbooks, setPlaybooks] = useState<SitePlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPlaybooks = useCallback(async () => {
    if (!site?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_playbooks')
        .select('*')
        .eq('site_id', site.id);
      
      if (error) throw error;
      
      // Map database fields to camelCase
      const mapped: SitePlaybook[] = (data || []).map(row => ({
        id: row.id,
        siteId: row.site_id,
        metricId: row.metric_id as ParameterKey,
        condition: row.condition as 'low' | 'high',
        title: row.title,
        steps: row.steps || [],
        referenceLinks: row.reference_links || [],
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      setPlaybooks(mapped);
    } catch (error) {
      console.error('Error fetching playbooks:', error);
      toast.error('Failed to load playbooks');
    } finally {
      setLoading(false);
    }
  }, [site?.id]);

  useEffect(() => {
    if (!siteLoading && site?.id) {
      fetchPlaybooks();
    }
  }, [site?.id, siteLoading, fetchPlaybooks]);

  // Get playbook for a specific metric and condition
  // Falls back to default if no custom playbook exists
  const getPlaybook = useCallback((metricId: ParameterKey, condition: 'low' | 'high'): SitePlaybook | DefaultPlaybook | undefined => {
    const customPlaybook = playbooks.find(
      p => p.metricId === metricId && p.condition === condition && p.isActive
    );
    
    if (customPlaybook) return customPlaybook;
    
    // Fall back to default
    const defaults = generateDefaultPlaybooks();
    return defaults.find(p => p.metricId === metricId && p.condition === condition);
  }, [playbooks]);

  // Save or update a playbook
  const savePlaybook = useCallback(async (playbook: Omit<SitePlaybook, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!site?.id) return;
    
    setSaving(true);
    try {
      const upsertData = {
        site_id: site.id,
        metric_id: playbook.metricId,
        condition: playbook.condition,
        title: playbook.title,
        steps: playbook.steps,
        reference_links: playbook.referenceLinks,
        is_active: playbook.isActive,
      };

      const { error } = await supabase
        .from('site_playbooks')
        .upsert(upsertData, {
          onConflict: 'site_id,metric_id,condition',
        });

      if (error) throw error;
      
      await fetchPlaybooks();
      toast.success('Playbook saved successfully');
    } catch (error) {
      console.error('Error saving playbook:', error);
      toast.error('Failed to save playbook');
    } finally {
      setSaving(false);
    }
  }, [site?.id, fetchPlaybooks]);

  // Initialize default playbooks for the site
  const initializeDefaults = useCallback(async () => {
    if (!site?.id) return;
    
    setSaving(true);
    try {
      const defaults = generateDefaultPlaybooks();
      const upsertData = defaults.map(p => ({
        site_id: site.id,
        metric_id: p.metricId,
        condition: p.condition,
        title: p.title,
        steps: p.steps,
        reference_links: p.referenceLinks,
        is_active: true,
      }));

      const { error } = await supabase
        .from('site_playbooks')
        .upsert(upsertData, {
          onConflict: 'site_id,metric_id,condition',
          ignoreDuplicates: true,
        });

      if (error) throw error;
      
      await fetchPlaybooks();
      toast.success('Default playbooks initialized');
    } catch (error) {
      console.error('Error initializing playbooks:', error);
      toast.error('Failed to initialize playbooks');
    } finally {
      setSaving(false);
    }
  }, [site?.id, fetchPlaybooks]);

  // Delete a playbook
  const deletePlaybook = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_playbooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchPlaybooks();
      toast.success('Playbook deleted');
    } catch (error) {
      console.error('Error deleting playbook:', error);
      toast.error('Failed to delete playbook');
    } finally {
      setSaving(false);
    }
  }, [fetchPlaybooks]);

  // Get merged list of all playbooks (custom + defaults for missing)
  const getAllPlaybooks = useCallback((): (SitePlaybook | DefaultPlaybook)[] => {
    const defaults = generateDefaultPlaybooks();
    const result: (SitePlaybook | DefaultPlaybook)[] = [];
    
    for (const def of defaults) {
      const custom = playbooks.find(
        p => p.metricId === def.metricId && p.condition === def.condition
      );
      result.push(custom || def);
    }
    
    return result;
  }, [playbooks]);

  return {
    playbooks,
    loading: loading || siteLoading,
    saving,
    getPlaybook,
    savePlaybook,
    deletePlaybook,
    initializeDefaults,
    getAllPlaybooks,
    refetch: fetchPlaybooks,
  };
}
