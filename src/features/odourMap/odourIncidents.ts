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

export async function createIncident(input: {
  org_id: string;
  site_id: string;
  occurred_at: string;
  lat: number;
  lng: number;
  intensity: number;
  description: string;
  source?: string | null;
}) {
  const res = await supabase.from("odour_incidents").insert(input).select("*").single();
  if (res.error) throw res.error;
  return res.data;
}
