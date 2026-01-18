import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSite } from './useSite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { SiteMap, OdourIncident, WeatherData } from '@/types/odour';

// Legacy site maps hook (for backward compatibility)
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

// Site-based odour incidents hooks
export function useOdourIncidents(siteId?: string) {
  return useQuery({
    queryKey: ['odour-incidents', siteId],
    queryFn: async () => {
      if (!siteId) return [];
      
      const { data, error } = await supabase
        .from('odour_incidents')
        .select('*')
        .eq('site_id', siteId)
        .order('occurred_at', { ascending: false });
      
      if (error) throw error;
      return data as OdourIncident[];
    },
    enabled: !!siteId,
  });
}

export function useCreateOdourIncident() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (incident: {
      site_id: string;
      lat: number;
      lng: number;
      intensity?: number | null;
      description?: string | null;
      wind_speed?: number | null;
      wind_dir?: number | null;
      temperature?: number | null;
      humidity?: number | null;
      occurred_at?: string;
    }) => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('odour_incidents')
        .insert({
          site_id: incident.site_id,
          facility_id: incident.site_id, // Keep facility_id for backward compat (same as site_id)
          lat: incident.lat,
          lng: incident.lng,
          intensity: incident.intensity ?? null,
          description: incident.description ?? null,
          wind_speed: incident.wind_speed ?? null,
          wind_dir: incident.wind_dir ?? null,
          temperature: incident.temperature ?? null,
          humidity: incident.humidity ?? null,
          created_by: user.id,
          occurred_at: incident.occurred_at ?? new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const createdIncident = data as OdourIncident;
      
      // Send email alert for high-intensity incidents (4-5)
      if (incident.intensity && incident.intensity >= 4) {
        try {
          await supabase.functions.invoke('send-odour-alert', {
            body: {
              incidentId: createdIncident.id,
              intensity: incident.intensity,
              description: incident.description,
              lat: incident.lat,
              lng: incident.lng,
              windSpeed: incident.wind_speed,
              temperature: incident.temperature,
              occurredAt: incident.occurred_at,
              siteId: incident.site_id,
            },
          });
          console.log('Odour alert email sent for high-intensity incident');
        } catch (emailError) {
          console.error('Failed to send odour alert email:', emailError);
        }
      }
      
      return createdIncident;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['odour-incidents'] });
      toast.success('Odour incident recorded successfully');
      if (data.intensity && data.intensity >= 4) {
        toast.info('Alert email sent to configured recipients');
      }
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
