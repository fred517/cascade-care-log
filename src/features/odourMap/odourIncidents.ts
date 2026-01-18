import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OdourIncident = Tables<"odour_incidents">;

export async function listIncidents(params: { orgId: string; siteId: string }) {
  const res = await supabase
    .from("odour_incidents")
    .select("*")
    .eq("org_id", params.orgId)
    .eq("site_id", params.siteId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (res.error) throw res.error;
  return res.data ?? [];
}

export interface WeatherData {
  wind_speed: number;
  wind_direction: number;
  wind_direction_text: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_description: string;
  weather_icon: string;
  feels_like: number;
  visibility: number;
  clouds: number;
  fetched_at: string;
}

export async function createIncident(input: {
  org_id: string;
  site_id: string;
  occurred_at: string;
  lat: number;
  lng: number;
  intensity: number;
  description: string;
  source?: string | null;
  weather?: WeatherData | null;
}) {
  const { weather, ...rest } = input;
  
  const insertData = {
    ...rest,
    wind_speed: weather?.wind_speed ?? null,
    wind_dir: weather?.wind_direction ?? null,
    temperature: weather?.temperature ?? null,
    humidity: weather?.humidity ?? null,
    weather: weather ? {
      description: weather.weather_description,
      icon: weather.weather_icon,
      pressure: weather.pressure,
      visibility: weather.visibility,
      clouds: weather.clouds,
      feels_like: weather.feels_like,
      wind_direction_text: weather.wind_direction_text,
      fetched_at: weather.fetched_at,
    } : null,
  };

  const res = await supabase.from("odour_incidents").insert(insertData).select("*").single();
  if (res.error) throw res.error;
  return res.data;
}
