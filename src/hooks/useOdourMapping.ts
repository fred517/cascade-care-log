import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { SiteMap, OdourIncident, WeatherData } from '@/types/odour';

export function useSiteMaps() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['site-maps', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];
      
      const { data, error } = await supabase
        .from('site_maps')
        .select('*')
        .eq('site_id', site.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SiteMap[];
    },
    enabled: !!site?.id,
  });
}

export function useCreateSiteMap() {
  const queryClient = useQueryClient();
  const { site } = useSite();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { name: string; description?: string; imageUrl: string; latitude?: number; longitude?: number }) => {
      if (!site?.id || !user?.id) throw new Error('No site or user');
      
      const { data, error } = await supabase
        .from('site_maps')
        .insert({
          site_id: site.id,
          name: params.name,
          description: params.description || null,
          image_url: params.imageUrl,
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as SiteMap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-maps'] });
      toast.success('Site map uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload site map: ${error.message}`);
    },
  });
}

export function useOdourIncidents() {
  const { site } = useSite();

  return useQuery({
    queryKey: ['odour-incidents', site?.id],
    queryFn: async () => {
      if (!site?.id) return [];
      
      const { data, error } = await supabase
        .from('odour_incidents')
        .select('*')
        .eq('site_id', site.id)
        .order('incident_at', { ascending: false });
      
      if (error) throw error;
      return data as OdourIncident[];
    },
    enabled: !!site?.id,
  });
}

export function useCreateOdourIncident() {
  const queryClient = useQueryClient();
  const { site } = useSite();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (incident: Partial<OdourIncident>) => {
      if (!site?.id || !user?.id) throw new Error('No site or user');
      
      const { data, error } = await supabase
        .from('odour_incidents')
        .insert({
          click_x: incident.click_x!,
          click_y: incident.click_y!,
          site_id: site.id,
          created_by: user.id,
          site_map_id: incident.site_map_id,
          latitude: incident.latitude,
          longitude: incident.longitude,
          incident_at: incident.incident_at,
          frequency: incident.frequency,
          intensity: incident.intensity,
          duration: incident.duration,
          offensiveness: incident.offensiveness,
          location_impact: incident.location_impact,
          odour_type: incident.odour_type,
          wind_speed: incident.wind_speed,
          wind_direction: incident.wind_direction,
          wind_direction_text: incident.wind_direction_text,
          temperature: incident.temperature,
          humidity: incident.humidity,
          pressure: incident.pressure,
          weather_description: incident.weather_description,
          weather_fetched_at: incident.weather_fetched_at,
          notes: incident.notes,
          source_suspected: incident.source_suspected,
          corrective_actions: incident.corrective_actions,
          follow_up_date: incident.follow_up_date,
          follow_up_notes: incident.follow_up_notes,
          status: incident.status || 'open',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as OdourIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-incidents'] });
      toast.success('Odour incident recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record incident: ${error.message}`);
    },
  });
}

export function useUpdateOdourIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OdourIncident> & { id: string }) => {
      const { data, error } = await supabase
        .from('odour_incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as OdourIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odour-incidents'] });
      toast.success('Incident updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update incident: ${error.message}`);
    },
  });
}

export function useFetchWeather() {
  return useMutation({
    mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }): Promise<WeatherData> => {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { latitude, longitude },
      });
      
      if (error) throw error;
      return data as WeatherData;
    },
    onError: (error: Error) => {
      console.error('Failed to fetch weather:', error);
      toast.error('Could not fetch weather data');
    },
  });
}
