import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';

export interface ContourPolygon {
  level: 'high' | 'medium' | 'low';
  threshold: number;
  intensity: number;
  coordinates: Array<{ x: number; y: number }>;
}

export interface PlumeGeometry {
  type: 'polygon';
  coordinates: Array<{ x: number; y: number }>;
  contours?: ContourPolygon[];
}

export interface OdourPrediction {
  id: string;
  site_id: string;
  source_id: string;
  valid_from: string | null;
  valid_to: string | null;
  geometry: PlumeGeometry;
  peak_intensity: number | null;
  model_version: string | null;
  created_at: string;
}

export function useOdourPredictions() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['odour-predictions', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];

      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('odour_predictions')
        .select('*')
        .eq('site_id', site.id)
        .or(`valid_to.is.null,valid_to.gte.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p) => ({
        ...p,
        geometry: p.geometry as unknown as PlumeGeometry,
      })) as OdourPrediction[];
    },
    enabled: !!site?.id,
  });
}

export function useCurrentPredictions() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['odour-predictions-current', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('odour_predictions')
        .select('*')
        .eq('site_id', site.id)
        .lte('valid_from', now)
        .or(`valid_to.is.null,valid_to.gte.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p) => ({
        ...p,
        geometry: p.geometry as unknown as PlumeGeometry,
      })) as OdourPrediction[];
    },
    enabled: !!site?.id,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useCreateOdourPrediction() {
  const queryClient = useQueryClient();
  const { site } = useSite();

  return useMutation({
    mutationFn: async (prediction: {
      source_id: string;
      valid_from?: string;
      valid_to?: string;
      geometry: PlumeGeometry;
      peak_intensity?: number;
      model_version?: string;
    }) => {
      if (!site?.id) throw new Error('No site selected');

      const insertData = {
        site_id: site.id,
        source_id: prediction.source_id,
        valid_from: prediction.valid_from,
        valid_to: prediction.valid_to,
        geometry: prediction.geometry,
        peak_intensity: prediction.peak_intensity,
        model_version: prediction.model_version,
      };

      const { data, error } = await supabase
        .from('odour_predictions')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['odour-predictions-current'] });
    },
  });
}

export function useDeleteOdourPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('odour_predictions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['odour-predictions-current'] });
    },
  });
}
