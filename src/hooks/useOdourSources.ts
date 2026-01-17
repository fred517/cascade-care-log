import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';
import { toast } from 'sonner';

export interface OdourSourceGeometry {
  type: 'point' | 'polygon';
  // For point: single coordinate as percentage (0-100)
  x?: number;
  y?: number;
  // For polygon: array of coordinates
  coordinates?: Array<{ x: number; y: number }>;
}

export interface OdourSource {
  id: string;
  site_id: string;
  name: string | null;
  geometry: OdourSourceGeometry;
  base_intensity: number | null;
  created_at: string;
}

export function useOdourSources() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['odour-sources', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];
      
      const { data, error } = await supabase
        .from('odour_sources')
        .select('*')
        .eq('site_id', site.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as OdourSource[];
    },
    enabled: !!site?.id,
  });
}

export function useCreateOdourSource() {
  const queryClient = useQueryClient();
  const { site } = useSite();

  return useMutation({
    mutationFn: async (params: { 
      name?: string; 
      geometry: OdourSourceGeometry; 
      base_intensity?: number;
    }) => {
      if (!site?.id) throw new Error('No site selected');
      
      const { data, error } = await supabase
        .from('odour_sources')
        .insert({
          site_id: site.id,
          name: params.name || null,
          geometry: params.geometry as any,
          base_intensity: params.base_intensity ?? 3,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as OdourSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-sources'] });
      toast.success('Odour source added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add source: ${error.message}`);
    },
  });
}

export function useUpdateOdourSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OdourSource> & { id: string }) => {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.geometry !== undefined) updateData.geometry = updates.geometry;
      if (updates.base_intensity !== undefined) updateData.base_intensity = updates.base_intensity;

      const { data, error } = await supabase
        .from('odour_sources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as OdourSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-sources'] });
      toast.success('Source updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update source: ${error.message}`);
    },
  });
}

export function useDeleteOdourSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('odour_sources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-sources'] });
      toast.success('Source deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete source: ${error.message}`);
    },
  });
}
