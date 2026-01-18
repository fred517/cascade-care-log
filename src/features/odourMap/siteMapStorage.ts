import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SiteMapRecord = Tables<"site_maps">;

const BUCKET = "site-maps";

export async function uploadSiteMap(params: {
  orgId: string;
  siteId: string;
  createdBy: string;
  file: File;
}) {
  const { orgId, siteId, createdBy, file } = params;

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "");
  const storagePath = `${orgId}/${siteId}/${Date.now()}.${safeExt}`;

  // Upload file
  const up = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Upsert DB record (unique on org_id, site_id)
  const db = await supabase
    .from("site_maps")
    .upsert({
      org_id: orgId,
      site_id: siteId,
      created_by: createdBy,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      image_url: urlData.publicUrl,
      name: file.name,
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,site_id" })
    .select("*")
    .single();

  if (db.error) throw db.error;
  return db.data;
}

export async function loadSiteMap(params: { orgId: string; siteId: string }) {
  const { orgId, siteId } = params;

  const db = await supabase
    .from("site_maps")
    .select("*")
    .eq("org_id", orgId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (db.error) throw db.error;
  
  // Generate signed URL if we have a storage path
  let signedUrl: string | null = null;
  if (db.data?.storage_path) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(db.data.storage_path);
    signedUrl = urlData.publicUrl;
  } else if (db.data?.image_url) {
    signedUrl = db.data.image_url;
  }
  
  return { record: db.data, signedUrl };
}

export async function loadSiteMaps(params: { orgId: string; siteId: string }) {
  const { orgId, siteId } = params;

  const db = await supabase
    .from("site_maps")
    .select("*")
    .eq("org_id", orgId)
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false });

  if (db.error) throw db.error;
  
  return db.data;
}
