import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';

export interface WeatherSnapshot {
  id: string;
  site_id: string;
  recorded_at: string;
  wind_speed_mps: number | null;
  wind_direction_deg: number | null;
  temperature_c: number | null;
  stability_class: string | null;
  created_at: string;
}

export function useLatestWeatherSnapshot() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['weather-snapshot-latest', site?.id],
    queryFn: async () => {
      if (!site?.id) return null;
      
      const { data, error } = await supabase
        .from('weather_snapshots')
        .select('*')
        .eq('site_id', site.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as WeatherSnapshot | null;
    },
    enabled: !!site?.id,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

export function useWeatherSnapshots(limit = 24) {
  const { site } = useSite();

  return useQuery({
    queryKey: ['weather-snapshots', site?.id, limit],
    queryFn: async () => {
      if (!site?.id) return [];
      
      const { data, error } = await supabase
        .from('weather_snapshots')
        .select('*')
        .eq('site_id', site.id)
        .order('recorded_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as WeatherSnapshot[];
    },
    enabled: !!site?.id,
  });
}
