import { supabase } from "@/integrations/supabase/client";

export type SitemapRecord = {
  site_id: string;
  public_url: string;
  storage_bucket: string;
  storage_path: string;
  uploaded_at: string;
};

export type OdourIncident = {
  id: string;
  site_id: string;
  created_at: string;
  lat: number;
  lng: number;
  intensity: number;
  character?: string | null;
  notes?: string | null;
  weather?: any;
};

const cacheKey = (siteId: string) => `waterops:sitemap:${siteId}`;

export async function getSitemap(siteId: string): Promise<SitemapRecord | null> {
  // 1) Try DB
  const { data, error } = await supabase
    .from("site_sitemaps")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();

  if (!error && data) {
    localStorage.setItem(cacheKey(siteId), JSON.stringify(data));
    return data as SitemapRecord;
  }

  // 2) Fallback: cache
  const cached = localStorage.getItem(cacheKey(siteId));
  if (cached) {
    try {
      return JSON.parse(cached) as SitemapRecord;
    } catch {
      localStorage.removeItem(cacheKey(siteId));
    }
  }

  return null;
}

export async function uploadSitemap(siteId: string, file: File): Promise<SitemapRecord> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not signed in");

  const bucket = "site-maps";
  const ext = file.name.split(".").pop() || "bin";
  const path = `${siteId}/sitemap-${Date.now()}.${ext}`;

  // Upload to storage
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) throw upErr;

  // Generate public URL (or use signed URLs if you prefer private access)
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  if (!publicUrl) throw new Error("Could not get public URL");

  // Upsert metadata into DB (this is what makes it persist)
  const { data: rec, error: dbErr } = await supabase
    .from("site_sitemaps")
    .upsert(
      {
        site_id: siteId,
        storage_bucket: bucket,
        storage_path: path,
        public_url: publicUrl,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "site_id" }
    )
    .select("*")
    .single();

  if (dbErr) throw dbErr;
  localStorage.setItem(cacheKey(siteId), JSON.stringify(rec));
  return rec as SitemapRecord;
}

export async function listIncidents(siteId: string): Promise<OdourIncident[]> {
  const { data, error } = await supabase
    .from("odour_incidents")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OdourIncident[];
}

export async function createIncident(input: {
  siteId: string;
  lat: number;
  lng: number;
  intensity: number;
  character?: string;
  notes?: string;
  weather?: any;
}): Promise<OdourIncident> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not signed in");

  // Hard validation: prevents "nothing happens"
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error("Select a location on the map first.");
  }
  if (!Number.isInteger(input.intensity) || input.intensity < 0 || input.intensity > 10) {
    throw new Error("Intensity must be an integer from 0 to 10.");
  }

  const { data, error } = await supabase
    .from("odour_incidents")
    .insert({
      site_id: input.siteId,
      created_by: user.id,
      lat: input.lat,
      lng: input.lng,
      intensity: input.intensity,
      character: input.character ?? null,
      notes: input.notes ?? null,
      weather: input.weather ?? null,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data as OdourIncident;
}
