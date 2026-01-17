import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface OdourReportWeather {
  wind_speed: number;
  wind_direction: number;
  wind_direction_text: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_description: string;
  fetched_at: string;
}

export interface OdourReportOdour {
  type: string;
  intensity: number;
  frequency: number;
  duration: number | null;
  offensiveness: number;
  location_impact: string | null;
  source_suspected: string | null;
  notes: string | null;
}

export interface OdourReport {
  id: string;
  site_id: string;
  created_by: string;
  observed_at: string;
  latitude: number;
  longitude: number;
  weather: OdourReportWeather;
  odour: OdourReportOdour;
  created_at: string;
}

export function useOdourReports() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['odour-reports', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];
      
      const { data, error } = await supabase
        .from('odour_reports')
        .select('*')
        .eq('site_id', site.id)
        .order('observed_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as OdourReport[];
    },
    enabled: !!site?.id,
  });
}

export function useCreateOdourReport() {
  const queryClient = useQueryClient();
  const { site } = useSite();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      observed_at: string;
      latitude: number;
      longitude: number;
      weather: OdourReportWeather;
      odour: OdourReportOdour;
    }) => {
      if (!site?.id || !user?.id) throw new Error('No site or user');
      
      const { data, error } = await supabase
        .from('odour_reports')
        .insert([{
          site_id: site.id,
          created_by: user.id,
          observed_at: params.observed_at,
          latitude: params.latitude,
          longitude: params.longitude,
          weather: JSON.parse(JSON.stringify(params.weather)),
          odour: JSON.parse(JSON.stringify(params.odour)),
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as OdourReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-reports'] });
      toast.success('Odour report submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit report: ${error.message}`);
    },
  });
}
