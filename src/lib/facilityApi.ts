import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchWeatherSnapshot(lat: number, lng: number) {
  // Open-Meteo: no key required
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const json = await res.json();
  const c = json?.current;
  return {
    temperature: typeof c?.temperature_2m === "number" ? c.temperature_2m : undefined,
    humidity: typeof c?.relative_humidity_2m === "number" ? c.relative_humidity_2m : undefined,
    wind_speed: typeof c?.wind_speed_10m === "number" ? c.wind_speed_10m : undefined,
    wind_dir: typeof c?.wind_direction_10m === "number" ? c.wind_direction_10m : undefined,
  };
}

export type FacilitySitemap = {
  id: string;
  facility_id: string;
  storage_path: string;
  file_mime?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  created_at: string;
};

export type OdourIncident = {
  id: string;
  facility_id: string;
  occurred_at: string;
  lat: number;
  lng: number;
  intensity?: number | null;
  description?: string | null;
  wind_speed?: number | null;
  wind_dir?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  created_at: string;
};

const BUCKET = "waterops-private";

export async function getLatestSitemap(
  supabase: SupabaseClient,
  facilityId: string
): Promise<FacilitySitemap | null> {
  const { data, error } = await supabase
    .from("facility_sitemaps")
    .select("*")
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getSignedSitemapUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string> {
  // 1 hour is fine; refresh on page load anyway
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("No signed URL returned");
  return data.signedUrl;
}

export async function uploadSitemapAndPersist(
  supabase: SupabaseClient,
  args: {
    orgId: string;
    facilityId: string;
    file: File;
    userId?: string;
  }
): Promise<FacilitySitemap> {
  const { orgId, facilityId, file, userId } = args;

  const ext = file.name.split(".").pop() || "bin";
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `org/${orgId}/facility/${facilityId}/sitemaps/${crypto.randomUUID()}_${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("facility_sitemaps")
    .insert({
      facility_id: facilityId,
      storage_path: storagePath,
      file_mime: file.type,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: userId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FacilitySitemap;
}

export async function listIncidents(
  supabase: SupabaseClient,
  facilityId: string
): Promise<OdourIncident[]> {
  const { data, error } = await supabase
    .from("odour_incidents")
    .select("*")
    .eq("facility_id", facilityId)
    .order("occurred_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as OdourIncident[];
}

export async function createIncident(
  supabase: SupabaseClient,
  args: {
    facilityId: string;
    lat: number;
    lng: number;
    intensity?: number | null;
    description?: string | null;
    weather?: {
      wind_speed?: number;
      wind_dir?: number;
      temperature?: number;
      humidity?: number;
    };
    userId?: string;
    occurredAt?: Date;
  }
): Promise<OdourIncident> {
  const payload = {
    facility_id: args.facilityId,
    lat: args.lat,
    lng: args.lng,
    intensity: args.intensity ?? null,
    description: args.description ?? null,
    wind_speed: args.weather?.wind_speed ?? null,
    wind_dir: args.weather?.wind_dir ?? null,
    temperature: args.weather?.temperature ?? null,
    humidity: args.weather?.humidity ?? null,
    created_by: args.userId ?? null,
    occurred_at: (args.occurredAt ?? new Date()).toISOString(),
  };

  const { data, error } = await supabase
    .from("odour_incidents")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as OdourIncident;
}
