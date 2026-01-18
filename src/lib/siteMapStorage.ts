import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SiteMapRecord = Tables<"site_maps">;

const BUCKET = "site-maps";

export async function uploadSiteMap(params: {
  siteId: string;
  createdBy: string;
  file: File;
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}) {
  const { siteId, createdBy, file, name, description, latitude, longitude } = params;

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "");
  const fileName = `${siteId}/${Date.now()}.${safeExt}`;

  // Upload file
  const up = await supabase.storage.from(BUCKET).upload(fileName, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  // Insert DB record
  const db = await supabase
    .from("site_maps")
    .insert({
      site_id: siteId,
      created_by: createdBy,
      name: name || file.name,
      description: description || null,
      image_url: urlData.publicUrl,
      latitude: latitude || null,
      longitude: longitude || null,
    })
    .select("*")
    .single();

  if (db.error) throw db.error;
  return db.data;
}

export async function loadSiteMap(params: { siteId: string }) {
  const { siteId } = params;

  const db = await supabase
    .from("site_maps")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (db.error) throw db.error;
  
  return { record: db.data };
}

export async function loadSiteMaps(params: { siteId: string }) {
  const { siteId } = params;

  const db = await supabase
    .from("site_maps")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (db.error) throw db.error;
  
  return db.data;
}
