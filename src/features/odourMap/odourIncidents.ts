import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, Json } from "@/integrations/supabase/types";

export type OdourIncident = Tables<"odour_incidents">;

export async function listIncidents(params: { orgId: string; siteId: string }) {
  const { orgId, siteId } = params;

  const res = await supabase
    .from("odour_incidents")
    .select("*")
    .eq("org_id", orgId)
    .eq("site_id", siteId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (res.error) throw res.error;
  return res.data || [];
}

export async function createIncident(input: {
  org_id: string;
  site_id: string;
  lat: number;
  lng: number;
  intensity: number;
  description: string;
  source?: string | null;
  occurred_at?: string;
  created_by?: string | null;
}) {
  const payload: TablesInsert<"odour_incidents"> = {
    org_id: input.org_id,
    site_id: input.site_id,
    lat: input.lat,
    lng: input.lng,
    intensity: input.intensity,
    description: input.description,
    source: input.source ?? null,
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
