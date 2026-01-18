import { supabase } from "@/integrations/supabase/client";

const BUCKET = "site-maps";

export async function uploadSiteMap(params: {
  orgId: string;
  siteId: string;
  file: File;
}) {
  const { orgId, siteId, file } = params;

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "");
  const storagePath = `${orgId}/${siteId}/sitemap.${safeExt}`;

  const up = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;

  // Get current user for created_by
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get public URL for image_url
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const db = await supabase
    .from("site_maps")
    .upsert(
      {
        org_id: orgId,
        site_id: siteId,
        created_by: user.id,
        name: file.name,
        image_url: urlData.publicUrl,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
      },
      { onConflict: "org_id,site_id" }
    )
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
    .single();

  if (db.error) return { record: null, signedUrl: null };

  const record = db.data;

  // Use signed URL for private bucket or public URL
  if (record.storage_bucket && record.storage_path) {
    const signed = await supabase.storage
      .from(record.storage_bucket)
      .createSignedUrl(record.storage_path, 60 * 60);

    if (!signed.error) {
      return { record, signedUrl: signed.data.signedUrl };
    }
  }

  // Fall back to image_url if storage path not available
  return { record, signedUrl: record.image_url };
}
