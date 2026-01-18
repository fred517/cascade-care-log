import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, Json } from "@/integrations/supabase/types";

export type OdourIncident = Tables<"odour_incidents">;

export async function listIncidents(params: { siteId: string }) {
  const { siteId } = params;

  const res = await supabase
    .from("odour_incidents")
    .select("*")
    .eq("site_id", siteId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (res.error) throw res.error;
  return res.data || [];
}

export async function listIncidentsByFacility(params: { facilityId: string }) {
  const { facilityId } = params;

  const res = await supabase
    .from("odour_incidents")
    .select("*")
    .eq("facility_id", facilityId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (res.error) throw res.error;
  return res.data || [];
}

export async function createIncident(input: {
  facility_id: string;
  site_id?: string | null;
  lat: number;
  lng: number;
  intensity?: number | null;
  description?: string | null;
  character?: string | null;
  notes?: string | null;
  wind_speed?: number | null;
  wind_dir?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  weather?: Json | null;
  occurred_at?: string;
  created_by?: string | null;
}) {
  const payload: TablesInsert<"odour_incidents"> = {
    facility_id: input.facility_id,
    site_id: input.site_id ?? null,
    lat: input.lat,
    lng: input.lng,
    intensity: input.intensity ?? null,
    description: input.description ?? null,
    character: input.character ?? null,
    notes: input.notes ?? null,
    wind_speed: input.wind_speed ?? null,
    wind_dir: input.wind_dir ?? null,
    temperature: input.temperature ?? null,
    humidity: input.humidity ?? null,
    weather: input.weather ?? null,
    occurred_at: input.occurred_at || new Date().toISOString(),
    created_by: input.created_by ?? null,
  };

  const res = await supabase
    .from("odour_incidents")
    .insert([payload])
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data;
}
