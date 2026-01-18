import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Site {
  id: string;
  name: string;
  timezone: string;
  ammonia_basis: string;
  address?: string;
  org_id?: string;
}

export function useSite() {
  const { user } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSites();
    }
  }, [user]);

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('name');

      if (error) throw error;

      setSites(data || []);
      // Set first site as current by default
      if (data && data.length > 0) {
        setSite(data[0]);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectSite = (siteId: string) => {
    const selected = sites.find(s => s.id === siteId);
    if (selected) {
      setSite(selected);
    }
  };

  return { site, sites, loading, selectSite };
}
