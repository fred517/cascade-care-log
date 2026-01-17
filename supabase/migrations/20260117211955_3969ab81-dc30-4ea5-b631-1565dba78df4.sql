-- Drop existing facility_sitemaps policies
DROP POLICY IF EXISTS "facility_sitemaps_select_org_member" ON public.facility_sitemaps;
DROP POLICY IF EXISTS "facility_sitemaps_insert_org_member" ON public.facility_sitemaps;
DROP POLICY IF EXISTS "facility_sitemaps_update_org_admin" ON public.facility_sitemaps;
DROP POLICY IF EXISTS "facility_sitemaps_delete_org_admin" ON public.facility_sitemaps;

-- Create new policies with support access
CREATE POLICY "sitemaps_read"
ON public.facility_sitemaps
FOR SELECT
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.org_members m ON m.org_id = f.org_id
    WHERE f.id = facility_sitemaps.facility_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "sitemaps_write"
ON public.facility_sitemaps
FOR INSERT
WITH CHECK (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.org_members m ON m.org_id = f.org_id
    WHERE f.id = facility_sitemaps.facility_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "sitemaps_update"
ON public.facility_sitemaps
FOR UPDATE
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.org_members m ON m.org_id = f.org_id
    WHERE f.id = facility_sitemaps.facility_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "sitemaps_delete"
ON public.facility_sitemaps
FOR DELETE
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    WHERE f.id = facility_sitemaps.facility_id
      AND has_org_role(auth.uid(), f.org_id, ARRAY['owner', 'admin'])
  )
);