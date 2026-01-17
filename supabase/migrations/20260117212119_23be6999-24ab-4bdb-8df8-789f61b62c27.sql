-- Drop existing odour_incidents policies
DROP POLICY IF EXISTS "odour_incidents_select_org_member" ON public.odour_incidents;
DROP POLICY IF EXISTS "odour_incidents_insert_org_member" ON public.odour_incidents;
DROP POLICY IF EXISTS "odour_incidents_update_org_member" ON public.odour_incidents;
DROP POLICY IF EXISTS "odour_incidents_delete_org_admin" ON public.odour_incidents;

-- Create new policies with support access
CREATE POLICY "incidents_read"
ON public.odour_incidents
FOR SELECT
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.org_members m ON m.org_id = f.org_id
    WHERE f.id = odour_incidents.facility_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "incidents_write"
ON public.odour_incidents
FOR INSERT
WITH CHECK (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.org_members m ON m.org_id = f.org_id
    WHERE f.id = odour_incidents.facility_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "incidents_update"
ON public.odour_incidents
FOR UPDATE
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.org_members m ON m.org_id = f.org_id
    WHERE f.id = odour_incidents.facility_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "incidents_delete"
ON public.odour_incidents
FOR DELETE
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1
    FROM public.facilities f
    WHERE f.id = odour_incidents.facility_id
      AND has_org_role(auth.uid(), f.org_id, ARRAY['owner', 'admin'])
  )
);